import { stage } from "konva_setup";
import { animateConnection, animatePath, flashNode } from "bst_animation";
import { redrawTree, updateTreePositions } from "draw_bst";
import { layer } from "konva_setup";

let root = null;
const verticalSpacing = 80;

// Track original scale
let originalScale = 1;

// Calculate max depth of tree
function getMaxDepth(node) {
  if (!node) return 0;
  return 1 + Math.max(getMaxDepth(node.left), getMaxDepth(node.right));
}


function adjustZoomForDepth() {
  const maxDepth = getMaxDepth(root);
  let targetScale;

  if (maxDepth <= 5) {
    targetScale = originalScale;
  } else if (maxDepth <= 10) {
    targetScale = originalScale * 0.8;
  } else {
    targetScale = originalScale * 0.5;
  }

  if (Math.abs(targetScale - stage.scaleX()) > 0.01) {
    const stageWidth = stage.width();

   
    const newX = (stageWidth - stageWidth * targetScale) / 2;
    const newY = 0; 

    stage.to({
      scaleX: targetScale,
      scaleY: targetScale,
      x: newX,
      y: newY,
      duration: 0.5,
      easing: Konva.Easings.EaseInOut
    });
  }
}


export function insertNode(value) {
  console.log(`Inserting ${value}`);
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
    adjustZoomForDepth();
    return Promise.resolve();
  }
  
  let current = root;
  let parent;
  let isLeft = false;
  let path = [];
  
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
      adjustZoomForDepth();
      
      resolve();
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
      flashNode(current, 'orange', () => {
        root = bstDelete(root, value);
        updateTreePositions(root, 0, stage.width() / 2, 80, stage.width() / 4);
        layer.destroyChildren();
        redrawTree(root);
        adjustZoomForDepth();
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

export function getRoot() {
  return root;
}