// A user editing their own review puts it back to `pending`. That is a
// resubmission, not moderation, so the audit action is named accordingly.
// Only one line of write_audit_event() changes; the function is patched in
// place so the rest of its body stays exactly as migration 1700000014000 left it.

const moderatedLine = "v_action := 'review.moderated';";
const resubmittedLine =
  "v_action := CASE WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'pending' " +
  "THEN 'review.resubmitted' ELSE 'review.moderated' END;";

const swap = (from, to) => `
DO $migration$
DECLARE
  v_definition text := pg_get_functiondef('write_audit_event()'::regprocedure);
BEGIN
  IF position(${literal(from)} IN v_definition) = 0 THEN
    RAISE EXCEPTION 'write_audit_event() does not contain the expected review action line';
  END IF;
  EXECUTE replace(v_definition, ${literal(from)}, ${literal(to)});
END
$migration$;`;

function literal(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

export const up = (pgm) => {
  pgm.sql(swap(moderatedLine, resubmittedLine));
};

export const down = (pgm) => {
  pgm.sql(swap(resubmittedLine, moderatedLine));
};
