/**
 * Convert accessibility tree format to Playwright role selectors.
 *
 * Examples:
 *   link "Green Energy Fund" → role=link[name="Green Energy Fund"]
 *   button "Submit" → role=button[name="Submit"]
 *   heading "Home" → role=heading[name="Home"]
 */

const ROLES = [
  "link",
  "button",
  "heading",
  "textbox",
  "checkbox",
  "radio",
  "combobox",
  "listbox",
  "option",
  "menuitem",
  "menu",
  "tab",
  "tabpanel",
  "img",
  "dialog",
  "alertdialog",
  "alert",
  "status",
  "cell",
  "row",
  "grid",
  "table",
  "list",
  "listitem",
  "navigation",
  "main",
  "banner",
  "contentinfo",
  "complementary",
  "form",
  "search",
  "article",
  "region",
];

// Match: role "name" or role 'name'
const ROLE_PATTERN = new RegExp(`^(${ROLES.join("|")})\\s+["'](.+)["']$`, "i");

/**
 * Convert selector to Playwright format.
 * If it matches accessibility format, convert to role selector.
 * Otherwise return as-is (CSS/xpath/text selector).
 */
export function toPlaywrightSelector(selector: string): string {
  const trimmed = selector.trim();

  const match = trimmed.match(ROLE_PATTERN);
  if (match) {
    const [, role, name] = match;
    // Escape quotes in name
    const escapedName = name.replace(/"/g, '\\"');
    return `role=${role.toLowerCase()}[name="${escapedName}"]`;
  }

  return selector;
}
