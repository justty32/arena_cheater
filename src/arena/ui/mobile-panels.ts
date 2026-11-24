/** Native disclosures on narrow screens; preserve the player's choices across resize. */
export function createMobilePanels(root: HTMLElement) {
  const media = window.matchMedia('(max-width: 800px)');
  const panels = [...root.querySelectorAll<HTMLDetailsElement>('[data-mobile-panel]')];
  const choices = new Map<string, boolean>();
  const reflect = (panel: HTMLDetailsElement): void => {
    panel.querySelector('summary')?.setAttribute('aria-expanded', String(panel.open));
  };
  for (const panel of panels) panel.addEventListener('toggle', () => {
    reflect(panel);
    if (media.matches) choices.set(panel.dataset.mobilePanel!, panel.open);
  });
  const resize = (): void => {
    for (const panel of panels) {
      panel.open = media.matches ? choices.get(panel.dataset.mobilePanel!) ?? false : true;
      reflect(panel);
    }
  };
  media.addEventListener('change', resize);
  resize();
  return {
    open(name: string): void {
      const panel = panels.find(entry => entry.dataset.mobilePanel === name);
      if (panel) { panel.open = true; reflect(panel); }
    },
  };
}
