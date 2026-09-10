// One contact owns a gesture until release/cancel. Secondary fingers never select.
export function tilePointer() {
  let pointerId = null;
  let tileId = null;
  return {
    begin(event, id) {
      if (pointerId !== null || event.button !== 0 || event.isPrimary === false) return false;
      pointerId = event.pointerId;
      tileId = id;
      return true;
    },
    move(event, id) {
      if (pointerId !== event.pointerId || !id || tileId === id) return false;
      tileId = id;
      return true;
    },
    end(event) {
      if (event && pointerId !== event.pointerId) return;
      pointerId = null;
      tileId = null;
    },
    owns(event) { return pointerId === event.pointerId; },
  };
}
