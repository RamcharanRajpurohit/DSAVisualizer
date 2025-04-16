import { stage } from "konva_setup";
import { animateConnection, animatePath, flashNode } from "bst_animation";
import { updateZoom } from "bst_zoom";
import { redrawTree, updateTreePositions } from "draw_bst";
import { layer } from "konva_setup";

let root = null;
const verticalSpacing = 100;
// Function to get the height of a node
function getHeight(node) {
  if (!node) return -1;
  return node.height;
}



// Function to get the balance factor of a node
function getBalanceFactor(node) {
  if (!node) return 0;
  return getHeight(node.left) - getHeight(node.right);
}

// Function to update depths recursively
function updateDepths(node, depth) {
  if (!node) return;
  
  node.depth = depth;
  
  if (node.left) updateDepths(node.left, depth + 1);
  if (node.right) updateDepths(node.right, depth + 1);
}

// Function to perform a right rotation
function rightRotate(node) {
  const leftChild = node.left;
  const leftRightChild = leftChild.right;
  
  // Perform rotation
  leftChild.right = node;
  node.left = leftRightChild;
  
  // Update parent references
  leftChild.parent = node.parent;
  node.parent = leftChild;
  if (leftRightChild) leftRightChild.parent = node;
  
  // Update parent's child reference
  if (leftChild.parent) {
    if (leftChild.parent.left === node) {
      leftChild.parent.left = leftChild;
    } else {
      leftChild.parent.right = leftChild;
    }
  }
  
  // Update depths
  updateDepths(leftChild, leftChild.parent ? leftChild.parent.depth + 1 : 0);
  
  // Update heights
  node.height = 1 + Math.max(getHeight(node.left), getHeight(node.right));
  leftChild.height = 1 + Math.max(getHeight(leftChild.left), getHeight(leftChild.right));
  
  return leftChild;
}

// Function to perform a left rotation
function leftRotate(node) {
  const rightChild = node.right;
  const rightLeftChild = rightChild.left;
  
  // Perform rotation
  rightChild.left = node;
  node.right = rightLeftChild;
  
  // Update parent references
  rightChild.parent = node.parent;
  node.parent = rightChild;
  if (rightLeftChild) rightLeftChild.parent = node;
  
  // Update parent's child reference
  if (rightChild.parent) {
    if (rightChild.parent.left === node) {
      rightChild.parent.left = rightChild;
    } else {
      rightChild.parent.right = rightChild;
    }
  }
  
  // Update depths
  updateDepths(rightChild, rightChild.parent ? rightChild.parent.depth + 1 : 0);
  
  // Update heights
  node.height = 1 + Math.max(getHeight(node.left), getHeight(node.right));
  rightChild.height = 1 + Math.max(getHeight(rightChild.left), getHeight(rightChild.right));
  
  return rightChild;
}

// Function to balance the tree
export function balanceTree(node) {
  if (!node) return null;
  
  // Balance children recursively
  if (node.left) node.left = balanceTree(node.left);
  if (node.right) node.right = balanceTree(node.right);
  
  // Update height
  node.height = 1 + Math.max(getHeight(node.left), getHeight(node.right));
  
  // Get balance factor
  const balanceFactor = getBalanceFactor(node);
  
  // If balanced, return the node
  if (balanceFactor >= -1 && balanceFactor <= 1) {
    return node;
  }
  
  // Left heavy case
  if (balanceFactor > 1) {
    // Left-Right case
    if (getBalanceFactor(node.left) < 0) {
      node.left = leftRotate(node.left);
     
    }
    // Left-Left case (or converted Left-Right case)
    const newRoot = rightRotate(node);
 
    return newRoot;
  }
  
  // Right heavy case
  if (balanceFactor < -1) {
    // Right-Left case
    if (getBalanceFactor(node.right) > 0) {
      node.right = rightRotate(node.right);
     
    }
    // Right-Right case (or converted Right-Left case)
    const newRoot = leftRotate(node);
   
    return newRoot;
  }
  
  return node;
}

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
    height: 0, // initialize height for the new node
    circle: null,
    text: null
  };
  
  // If no root, set the new node as the root immediately.
  if (!root) {
    root = newNode;
    animateConnection(null, newNode);
    updateZoom();
    return Promise.resolve();
  }
  
  // Start the recursive insertion with an empty path.
  return recursiveInsert(root, newNode, []);
}

function recursiveInsert(current, newNode, path) {
  // Push the current node onto the traversal path.
  path.push(current);
  
  if (newNode.value < current.value) {
    if (current.left) {
      // Continue recursion into the left subtree.
      return recursiveInsert(current.left, newNode, path);
    } else {
      // Found the insertion point on the left.
     
      
      return new Promise(resolve => {
        animatePath(path, () => {
          current.left = newNode;
          newNode.parent = current;
          newNode.depth = current.depth + 1;
          const horizontalOffset = stage.width() / Math.pow(2, newNode.depth + 1);
          newNode.x = current.x - horizontalOffset;
          newNode.y = current.y + verticalSpacing;
          animateConnection(current, newNode, true);

          // Add a 1-second delay before proceeding
          setTimeout(() => {
          updateHeights(path);
          
          
          root = balanceTree(root);
          
          // Update tree visualization
          updateTreePositions(root, 0, stage.width() / 2, 80, stage.width() / 4);
          layer.destroyChildren();
          redrawTree(root);
          
          updateZoom();
          resolve();
        }, 2000);
        });
      });
    }
  } else {
    if (current.right) {
      // Continue recursion into the right subtree.
      return recursiveInsert(current.right, newNode, path);
    } else {
      // Found the insertion point on the right. 
      return new Promise(resolve => {
        animatePath(path, () => {
            current.right = newNode;
            newNode.parent = current;
            newNode.depth = current.depth + 1;
            const horizontalOffset = stage.width() / Math.pow(2, newNode.depth + 1);
            newNode.x = current.x + horizontalOffset;
            newNode.y = current.y + verticalSpacing;
    
            animateConnection(current, newNode, false);
    
            // Add a 1-second delay before proceeding
            setTimeout(() => {
                updateHeights(path);
    

                root = balanceTree(root);
    
                // Update tree visualization
                updateTreePositions(root, 0, stage.width() / 2, 80, stage.width() / 4);
                layer.destroyChildren();
                redrawTree(root);
    
                updateZoom();
                resolve();
            }, 2000);
        });
    });
    
    }
  }
}

// Update the height values along the path from the insertion point back to the root.
function updateHeights(path) {
  // Iterate the path in reverse order to update parent heights.
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i];
    // If a child is missing, consider its height as -1 so that a leaf node gets height 0.
    const leftHeight = node.left ? node.left.height : -1;
    const rightHeight = node.right ? node.right.height : -1;
    node.height = 1 + Math.max(leftHeight, rightHeight);
  }
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
        
        // Balance the tree after deletion
        root = balanceTree(root);
        
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
  
  // Update height
  if (node) {
    node.height = 1 + Math.max(getHeight(node.left), getHeight(node.right));
  }
  
  return node;
}

export function traverseTree() {
  let current = root;
  let path = [];
  
  while (current) {
    path.push(current);
    current = current.left;
  }
  
  animatePath(path, () => {
    let current = path.pop();
    flashNode(current, 'green', () => {
      if (current.right) {
        current = current.right;
        path.push(current);
        while (current.left) {
          current = current.left;
          path.push(current);
        }
      }
      traverseTree();
    });
  });
}

