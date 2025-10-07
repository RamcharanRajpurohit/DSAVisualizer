import { stage, layer } from 'konva_setup';
import { redrawTree } from 'draw_bst';
import { insertNode, findNode, deleteNode } from 'bst_operations';

// ------------------ Input Handling ------------------
const nodeInput = document.getElementById("nodeInput");
const arrayInput = document.getElementById("arrayInput");
const deleteInput = document.getElementById("deleteInput");
const findInput = document.getElementById("findInput");

// helper: process multiple values
async function processValues(values) {
  for (const value of values) {
    const num = parseInt(value);
    if (!isNaN(num)) await insertNode(num);
  }
}

// 🧩 Merged insert functionality
async function handleInsert() {
  const singleVal = nodeInput.value.trim();
  const arrayVal = arrayInput.value.trim();

  if (arrayVal) {
    const valuesArray = arrayVal.split(/[\s,]+/).filter(v => v !== '');
    await processValues(valuesArray);
    arrayInput.value = '';
  } else if (singleVal) {
    await insertNode(parseInt(singleVal));
    nodeInput.value = '';
  }
}

// hit enter → same as button click
[nodeInput, arrayInput].forEach(input => {
  input.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await handleInsert();
    }
  });
});

// button click does the same thing
document.getElementById("insertNodeBtn").addEventListener('click', handleInsert);

// 🗑️ Delete functionality
deleteInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    const value = parseInt(event.target.value.trim());
    if (!isNaN(value)) deleteNode(value);
    event.target.value = '';
  }
});

document.getElementById("deleteNodeBtn").addEventListener('click', () => {
  const value = parseInt(deleteInput.value.trim());
  if (!isNaN(value)) deleteNode(value);
  deleteInput.value = '';
});

// 🔍 Find functionality
findInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    const value = parseInt(event.target.value.trim());
    if (!isNaN(value)) findNode(value);
    event.target.value = '';
  }
});

document.getElementById("findNodeBtn").addEventListener('click', () => {
  const value = parseInt(findInput.value.trim());
  if (!isNaN(value)) findNode(value);
  findInput.value = '';
});

// 🔎 Zoom Controls
document.getElementById("zoomIn").addEventListener('click', () => {
  const scale = stage.scaleX() * 1.1;
  stage.scale({ x: scale, y: scale });
  stage.draw();
});

document.getElementById("zoomOut").addEventListener('click', () => {
  const scale = stage.scaleX() / 1.1;
  stage.scale({ x: scale, y: scale });
  stage.draw();
});

// 🪄 Handle Resize
window.addEventListener('resize', () => {
  stage.width(window.innerWidth);
  stage.height(window.innerHeight - 50);
  if (root) {
    updateTreePositions(root, 0, stage.width() / 2, 80, stage.width() / 4);
    layer.destroyChildren();
    redrawTree(root);
  }
  updateZoom();
});
