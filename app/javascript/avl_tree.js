import { stage} from "konva_setup";
import { insertNode, findNode, deleteNode } from "avl_operations";

const nodeInput = document.getElementById("nodeInput");
const arrayInput = document.getElementById("arrayInput");
const deleteInput = document.getElementById("deleteInput");
const findInput = document.getElementById("findInput");

// helper: process array input
async function processArray(values) {
  for (const value of values) {
    const num = parseInt(value);
    if (!isNaN(num)) await insertNode(num);
  }
}

// 🌟 Merged Insert Functionality
async function handleInsert() {
  const singleVal = nodeInput.value.trim();
  const arrayVal = arrayInput.value.trim();

  if (arrayVal) {
    const values = arrayVal.split(/[\s,]+/).filter(v => v !== "");
    await processArray(values);
    arrayInput.value = "";
  } else if (singleVal) {
    await insertNode(parseInt(singleVal));
    nodeInput.value = "";
  }
}

// ✅ Event listeners for insert
[nodeInput, arrayInput].forEach(input => {
  input.addEventListener("keypress", async e => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleInsert();
    }
  });
});

document.getElementById("insertNodeBtn").addEventListener("click", handleInsert);
document.getElementById("insertArrayBtn").addEventListener("click", handleInsert);

// 🗑️ Delete Functionality
function handleDelete() {
  const value = parseInt(deleteInput.value.trim());
  if (!isNaN(value)) deleteNode(value);
  deleteInput.value = "";
}

deleteInput.addEventListener("keypress", e => {
  if (e.key === "Enter") handleDelete();
});
document.getElementById("deleteNodeBtn").addEventListener("click", handleDelete);

// 🔍 Find Functionality
function handleFind() {
  const value = parseInt(findInput.value.trim());
  if (!isNaN(value)) findNode(value);
  findInput.value = "";
}

findInput.addEventListener("keypress", e => {
  if (e.key === "Enter") handleFind();
});
document.getElementById("findNodeBtn").addEventListener("click", handleFind);

// 🔎 Zoom Controls
document.getElementById("zoomIn").addEventListener("click", () => {
  const scale = stage.scaleX() * 1.1;
  stage.scale({ x: scale, y: scale });
  stage.draw();
});

document.getElementById("zoomOut").addEventListener("click", () => {
  const scale = stage.scaleX() / 1.1;
  stage.scale({ x: scale, y: scale });
  stage.draw();
});


