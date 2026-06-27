import { type Page } from "playwright";

export type ElementCandidate = {
  selector: string;
  role: string;
  name: string;
  tagName: string;
};

export function quoteRoleSelectorName(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function collectElementCandidates(
  page: Page
): Promise<ElementCandidate[]> {
  return page
    .locator("a,button,input,select,textarea,[role]")
    .evaluateAll((elements) => {
      function roleForElement(element: Element): string | null {
        const explicitRole = element.getAttribute("role");
        if (explicitRole) {
          return explicitRole;
        }

        switch (element.tagName.toLowerCase()) {
          case "a":
            return "link";
          case "button":
            return "button";
          case "input": {
            const type = element.getAttribute("type") ?? "text";
            return type === "button" || type === "submit" ? "button" : "textbox";
          }
          case "select":
            return "combobox";
          case "textarea":
            return "textbox";
          default:
            return null;
        }
      }

      function labelTextForElement(element: Element): string | null {
        const id = element.getAttribute("id");
        if (!id) {
          return null;
        }

        const label = element.ownerDocument.querySelector(
          `label[for="${CSS.escape(id)}"]`
        );
        return label?.textContent?.trim() || null;
      }

      function nameForElement(element: Element): string {
        const ariaLabel = element.getAttribute("aria-label")?.trim();
        if (ariaLabel) {
          return ariaLabel;
        }

        const labelText = labelTextForElement(element);
        if (labelText) {
          return labelText;
        }

        const placeholder = element.getAttribute("placeholder")?.trim();
        if (placeholder) {
          return placeholder;
        }

        return element.textContent?.replace(/\s+/g, " ").trim() ?? "";
      }

      function quoteSelectorValue(value: string): string {
        return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      }

      function toCandidate(element: Element): ElementCandidate | null {
        const role = roleForElement(element);
        const name = nameForElement(element);
        if (!role || !name) {
          return null;
        }

        return {
          selector: `role=${role}[name="${quoteSelectorValue(name)}"]`,
          role,
          name,
          tagName: element.tagName.toLowerCase()
        };
      }

      return elements
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const bounds = element.getBoundingClientRect();

          return (
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            bounds.width > 0 &&
            bounds.height > 0
          );
        })
        .map(toCandidate)
        .filter((candidate): candidate is ElementCandidate => candidate !== null);
    });
}
