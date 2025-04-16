import { stage } from "konva_setup";
import { traverseTree } from "avl_operations";
export function updateZoom(root) {
    if (!root) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    traverseTree(root, function(node) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });
    const margin = 100;
    let treeWidth = maxX - minX + margin * 2;
    let treeHeight = maxY - minY + margin * 2;
    let scaleX = stage.width() / treeWidth;
    let scaleY = stage.height() / treeHeight;
    let newScale = (scaleX < 1 || scaleY < 1) ? Math.min(scaleX, scaleY) : 1;
    if (Math.abs(newScale - stage.scaleX()) > 0.001) {
      stage.scale({ x: newScale, y: newScale });
      stage.draw();
    }
  }