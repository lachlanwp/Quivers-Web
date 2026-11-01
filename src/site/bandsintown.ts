const SCRIPT = "https://widgetv3.bandsintown.com/main.min.js";

/**
 * The Bandsintown widget script turns .bit-widget-initializer links into a
 * tour list when it loads. After an in-page navigation brings in a new
 * widget, load the script again so it draws it.
 */
export const refreshBandsintown = (root: ParentNode): void => {
  if (!root.querySelector(".bit-widget-initializer")) return;
  document.querySelectorAll(`script[src="${SCRIPT}"]`).forEach((s) => s.remove());
  const script = document.createElement("script");
  script.src = SCRIPT;
  script.async = true;
  script.charset = "utf-8";
  document.body.append(script);
};
