export const empty = () => {};

export const scrollInto = (element: Element) => {
  if (isElementInViewport(element))
    return;
  const options: ScrollIntoViewOptions = {
    behavior: "smooth",
    block: "center",
    inline: "center",
  };
  element.scrollIntoView(options);
};


function isElementInViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  const rootElement = document.documentElement as HTMLElement;
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || rootElement.clientHeight) &&
    rect.right <= (window.innerWidth || rootElement.clientWidth)
  );
}
