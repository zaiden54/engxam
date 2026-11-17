import "server-only";
import { getPool } from "@/lib/db/pool";
import { inTransaction } from "@/lib/db/transaction";
import { authorizeEnrollment } from "../literature/access";
import { literatureTotals } from "../literature/service";
import { glossaryTotals } from "../glossary/service";

export function studySummary(actorId: string, enrollmentId: string) {
  return inTransaction(getPool(), async client => {
    await authorizeEnrollment(client, actorId, enrollmentId);
    const sources = await literatureTotals(client, enrollmentId);
    const terms = await glossaryTotals(client, enrollmentId);
    return { sources, terms };
  });
}
