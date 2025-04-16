import { stage } from "konva_setup";
import { animateConnection ,animatePath,flashNode } from "bst_animation";
import { updateZoom } from "bst_zoom";
import { redrawTree,updateTreePositions } from "draw_bst";
import { layer } from "konva_setup";
let root = null;


const verticalSpacing = 100;
export function insertNode(value) {
    console.log(` ${value}`);
    const newNode = {
      value,
      left: null,
      right: null,
      x: stage.width() / 2,
      y: 80,
      parent: null,
      depth: 0,
      circle: null,
      text: null
    };
  
    // If no root, set and finish immediately.
    if (!root) {
      root = newNode;
      animateConnection(null, newNode);
      updateZoom();
      return Promise.resolve(); // Immediately resolve if there's nothing to animate.
    }
  
    let current = root;
    let parent;
    let isLeft = false;
    let path = [];  // Traversed path
  
    while (current) {
      path.push(current);
      parent = current;
      if (value < current.value) {
        current = current.left;
        isLeft = true;
      } else {
        current = current.right;
        isLeft = false;
      }
    }
  
    // Wrap the asynchronous animation in a promise.
    return new Promise(resolve => {
      animatePath(path, () => {
        newNode.parent = parent;
        newNode.depth = parent.depth + 1;
        const horizontalOffset = stage.width() / Math.pow(2, newNode.depth + 1);
        
        if (isLeft) {
          parent.left = newNode;
          newNode.x = parent.x - horizontalOffset;
        } else {
          parent.right = newNode;
          newNode.x = parent.x + horizontalOffset;
        }
  
        newNode.y = parent.y + verticalSpacing;
        
        animateConnection(parent, newNode, isLeft);
        updateZoom();
        resolve();  // Resolve when the animation is finished.
      });
    });
  }
  

 export function findNode(value) {
    let current = root;
    let path = [];
    while (current) {
      path.push(current);
      if (value === current.value) break;
      else if (value < current.value) current = current.left;
      else current = current.right;
    }
    animatePath(path, () => {
      if (!current || current.value !== value) {
        alert("Node not found");
      } else {
        // Use blue flash for find
        flashNode(current, 'blue');
      }
    });
  }
  export function deleteNode(value) {
    let current = root;
    let path = [];
    while (current) {
      path.push(current);
      if (value === current.value) break;
      else if (value < current.value) current = current.left;
      else current = current.right;
    }
    animatePath(path, () => {
      if (!current || current.value !== value) {
        alert("Node not found");
      } else {
        // Flash node in orange then perform deletion
        flashNode(current, 'orange', () => {
          root = bstDelete(root, value);
          // Recalculate tree positions with root centered
          updateTreePositions(root, 0, stage.width() / 2, 80, stage.width() / 4);
          layer.destroyChildren();
          redrawTree(root);
          updateZoom();
        });
      }
    });
  }
  function bstDelete(node, value) {
    if (!node) return null;
    if (value < node.value) {
      node.left = bstDelete(node.left, value);
    } else if (value > node.value) {
      node.right = bstDelete(node.right, value);
    } else {
      if (!node.left && !node.right) {
        return null;
      } else if (!node.left) {
        node.right.parent = node.parent;
        return node.right;
      } else if (!node.right) {
        node.left.parent = node.parent;
        return node.left;
      } else {
        let successor = node.right;
        while (successor.left) {
          successor = successor.left;
        }
        node.value = successor.value;
        node.right = bstDelete(node.right, successor.value);
      }
    }
    return node;
  }