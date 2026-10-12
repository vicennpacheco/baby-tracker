// Isomorphic: the delete dialog enables its button with it and
// deleteHousehold checks it again on the server (decision 071).

function normalize(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

/**
 * Typing the baby's name confirms deleting the family. Case and extra
 * spaces do not matter, so it is easy to get right on a phone keyboard;
 * accents do, as typing the name on purpose is the point.
 */
export function matchesBabyName(typed: string, babyName: string): boolean {
  const expected = normalize(babyName);
  return expected.length > 0 && normalize(typed) === expected;
}
