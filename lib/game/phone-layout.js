// Dimensions are CSS pixels after browser chrome and safe-area padding.
export function phoneMode(width, height, touch) {
  return touch && (width < 600 || (width > height && width < 1000 && height < 500));
}

export function phoneLayout(width, height) {
  const landscape = width > height;
  // Portrait: header, information, word, actions, save note, five 1px gaps, 4px padding.
  const boardSpace = landscape ? height - 4 : height - 171;
  const boardWidth = landscape ? width - 224 : width - 8;
  const cellWidth = Math.min(54, (boardWidth - 6) / 7);
  const cellHeight = Math.min(52, cellWidth, (boardSpace - 9) / 8);
  return {
    phone: true, landscape, width, height, scale: 1,
    cellWidth: Math.max(40, cellWidth), cellHeight: Math.max(40, cellHeight),
    blocked: cellWidth < 40 || cellHeight < 40,
  };
}
