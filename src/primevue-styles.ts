/**
 * Utility for scoping PrimeVue styles to specific Session Report application classes.
 * This prevents PrimeVue styles from leaking into other parts of the UI.
 */

/**
 * Scopes PrimeVue CSS rules to specific Session Report application classes.
 * This function modifies CSS selectors from PrimeVue stylesheets to only apply
 * within specific Foundry VTT application classes.
 */
export function scopePrimeVueStyles(): void {
  // Base classes that all Session Report applications should scope to
  const classes = [
    "session-report-dialog"
  ];

  // Selectors that should NOT be scoped (global PrimeVue elements)
  const excludedPatterns = [
    /^\.application\.sheet\.session-report-.*? /i,
    /^\.application\.dialog-sheet\.session-report-.*? /i,
    /^\:root/i,
    /-overlay$/i,
    new RegExp(
      `^(${[
        "\\.p-autocomplete-list-container",
        "\\.p-autocomplete-list",
        "\\.p-autocomplete-option",
        "\\.p-virtualscroller",
        "\\.p-virtualscroller-content",
        "\\.p-multiselect-header",
        "\\.p-multiselect-list-container",
        "\\.p-multiselect-list",
        "\\.p-multiselect-option",
        "\\.p-select-list",
        "\\.p-checkbox-input",
        "\\.p-checkbox-box",
        "\\.pi-.*?",
        "\\.pi"
      ].join("|")})`,
      "i"
    )
  ];

  // Find and modify PrimeVue stylesheets
  Array.from(document.styleSheets)
    .filter(
      ss =>
        typeof (ss.ownerNode! as HTMLElement).dataset.primevueStyleId !==
        "undefined"
    )
    .forEach(ss => {
      Array.from(ss.cssRules).forEach(rule => {
        // @ts-expect-error - CSSRule.selectorText exists on CSSStyleRule
        if (!rule.selectorText) return;

        // @ts-expect-error - CSSRule.selectorText exists on CSSStyleRule
        const originalSelector = rule.selectorText;

        // Skip if already processed (contains our scope classes)
        if (originalSelector.includes(".application.sheet.session-report-")) return;
        if (originalSelector.includes(".application.dialog-sheet.session-report-"))
          return;

        // Check if rule should be excluded from scoping
        const shouldExclude = excludedPatterns.some(pattern =>
          pattern.test(originalSelector)
        );

        if (shouldExclude) {
          // For excluded patterns (overlay components), add scoped versions
          // while keeping the original unscoped rule
          const scopedSelectors = classes
            .map(
              cls =>
                `.application.sheet.${cls} ${originalSelector}, .application.dialog-sheet.${cls} ${originalSelector}`
            )
            .join(", ");

          // Combine original (unscoped) with scoped versions
          // @ts-expect-error - CSSRule.selectorText exists on CSSStyleRule
          rule.selectorText = `${originalSelector}, ${scopedSelectors}`;
        } else {
          // Scope the selector to all specified classes
          // @ts-expect-error - CSSRule.selectorText exists on CSSStyleRule
          rule.selectorText = classes
            .map(
              cls =>
                `.application.sheet.${cls} ${originalSelector}, .application.dialog-sheet.${cls} ${originalSelector}`
            )
            .join(", ");
        }
      });
    });
}
