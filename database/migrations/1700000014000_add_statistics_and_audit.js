export const up = (pgm) => {
  pgm.createTable("audit_events", {
    id: { type: "bigserial", primaryKey: true },
    actor_id: { type: "bigint" },
    entity_type: { type: "varchar(40)", notNull: true },
    entity_id: { type: "text", notNull: true },
    action: { type: "varchar(60)", notNull: true },
    changed_fields: { type: "text[]", notNull: true, default: pgm.func("ARRAY[]::text[]") },
    metadata: { type: "jsonb", notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.createIndex("audit_events", ["created_at", "id"]);
  pgm.createIndex("audit_events", ["entity_type", "entity_id", "created_at"]);

  pgm.sql(`
    CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'audit records are append-only' USING ERRCODE = '55000';
    END;
    $$;

    CREATE TRIGGER audit_events_append_only
      BEFORE UPDATE OR DELETE ON audit_events
      FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();

    CREATE FUNCTION write_audit_event() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      v_actor_id bigint := NULLIF(current_setting('app.actor_user_id', true), '')::bigint;
      v_fields text[] := ARRAY[]::text[];
      v_metadata jsonb := '{}'::jsonb;
      v_entity_id text;
      v_action text;
      v_column text;
    BEGIN
      IF TG_TABLE_NAME = 'users' THEN
        IF OLD.role IS DISTINCT FROM NEW.role THEN
          IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'actor context required for role changes' USING ERRCODE = '42501';
          END IF;
          v_fields := ARRAY['role'];
          v_metadata := jsonb_build_object('oldRole', OLD.role, 'newRole', NEW.role);
          v_entity_id := NEW.id::text;
          v_action := 'user.role_changed';
        ELSE
          RETURN NEW;
        END IF;
      ELSIF TG_TABLE_NAME = 'reviews' THEN
        IF OLD.status IS DISTINCT FROM NEW.status OR OLD.is_flagged IS DISTINCT FROM NEW.is_flagged THEN
          v_entity_id := NEW.id::text;
          IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_fields := array_append(v_fields, 'status');
            v_metadata := v_metadata || jsonb_build_object('oldStatus', OLD.status, 'newStatus', NEW.status);
          END IF;
          IF OLD.is_flagged IS DISTINCT FROM NEW.is_flagged THEN
            v_fields := array_append(v_fields, 'isFlagged');
            v_metadata := v_metadata || jsonb_build_object('oldIsFlagged', OLD.is_flagged, 'newIsFlagged', NEW.is_flagged);
          END IF;
          v_action := 'review.moderated';
        ELSE
          RETURN NEW;
        END IF;
      ELSIF TG_TABLE_NAME = 'game_clubs' THEN
        v_entity_id := NEW.id::text;
        IF TG_OP = 'INSERT' THEN
          v_fields := ARRAY['created'];
          v_metadata := jsonb_build_object('status', NEW.status);
          v_action := 'club.created';
        ELSE
          FOREACH v_column IN ARRAY ARRAY['name','slug','description','address','city','location','working_hours','timezone','status','is_active'] LOOP
            IF to_jsonb(OLD)->v_column IS DISTINCT FROM to_jsonb(NEW)->v_column THEN
              v_fields := array_append(v_fields, v_column);
            END IF;
          END LOOP;
          IF cardinality(v_fields) = 0 THEN RETURN NEW; END IF;
          IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'club.status_changed';
            v_metadata := jsonb_build_object('oldStatus', OLD.status, 'newStatus', NEW.status);
          ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
            v_action := 'club.activation_changed';
            v_metadata := jsonb_build_object('oldIsActive', OLD.is_active, 'newIsActive', NEW.is_active);
          ELSE
            v_action := 'club.updated';
          END IF;
        END IF;
      ELSE
        RAISE EXCEPTION 'unsupported audit source %', TG_TABLE_NAME;
      END IF;

      INSERT INTO audit_events(actor_id, entity_type, entity_id, action, changed_fields, metadata)
      VALUES (v_actor_id, CASE TG_TABLE_NAME WHEN 'game_clubs' THEN 'club' WHEN 'users' THEN 'user' ELSE 'review' END,
        v_entity_id, v_action, v_fields, v_metadata);
      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER game_clubs_audit
      AFTER INSERT OR UPDATE ON game_clubs
      FOR EACH ROW EXECUTE FUNCTION write_audit_event();
    CREATE TRIGGER users_role_audit
      AFTER UPDATE OF role ON users
      FOR EACH ROW EXECUTE FUNCTION write_audit_event();
    CREATE TRIGGER reviews_moderation_audit
      AFTER UPDATE OF status, is_flagged ON reviews
      FOR EACH ROW EXECUTE FUNCTION write_audit_event();
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER reviews_moderation_audit ON reviews;
    DROP TRIGGER users_role_audit ON users;
    DROP TRIGGER game_clubs_audit ON game_clubs;
    DROP FUNCTION write_audit_event();
    DROP TRIGGER audit_events_append_only ON audit_events;
    DROP FUNCTION reject_audit_mutation();
  `);
  pgm.dropTable("audit_events");
};
