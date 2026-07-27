/**
 * Which practice challenges belong to which module.
 *
 * The platform teaches and it drills, and until now those were two unconnected
 * halves: 165 lessons had been finished four times while the challenges had
 * been solved 221 times. Nobody arriving for a Crypto challenge was ever shown
 * the Crypto module, and nobody finishing that module was shown what to go and
 * break with it.
 *
 * The join is by category rather than a foreign key on purpose. Challenges
 * already carry a category, modules are a fixed set of eight, and the mapping
 * between them is stable — so this costs no migration, and a challenge imported
 * tomorrow lands in the right module the moment it is given a category.
 */

/** Module slug → the challenge categories that module prepares you for. */
const MODULE_PRACTICE: Record<string, string[]> = {
  "linux-command-line": ["Scripting", "Miscellaneous"],
  "networking-for-security": ["Networking"],
  "web-application-security": ["Web"],
  "cryptography-for-security": ["Crypto"],
  "reconnaissance-and-scanning": ["Recon"],
  "exploitation-and-privilege-escalation": ["Exploitation", "Pwn"],
  "forensics-and-incident-response": ["Forensics", "Steganography"],
  "ctf-methodology": ["Reverse", "Others"],
};

/** The categories a module drills. Empty when the module has no practice set. */
export function practiceCategoriesFor(slug: string | null | undefined): string[] {
  if (!slug) return [];
  return MODULE_PRACTICE[slug] ?? [];
}

/**
 * The module that teaches a given challenge category, if any — the reverse
 * lookup, built from the same table so the two directions cannot disagree.
 */
export function moduleSlugForCategory(category: string | null | undefined): string | null {
  if (!category) return null;
  for (const [slug, categories] of Object.entries(MODULE_PRACTICE)) {
    if (categories.includes(category)) return slug;
  }
  return null;
}
