import { stage,layer } from "konva_setup";
import  {redrawTree} from "draw_avl";
import {insertNode,findNode,deleteNode} from "avl_operations";
import { updateZoom } from "avl_zoom";




  
    
   

    // ------------------ Input and Zoom Button Event Listeners ------------------
    document.getElementById("nodeInput").addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const value = event.target.value.trim();
        if (value) {
          insertNode(parseInt(value));
          event.target.value = '';
        }
      }
    });

    document.getElementById("deleteInput").addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const value = event.target.value.trim();
        if (value) {
          deleteNode(parseInt(value));
          event.target.value = '';
        }
      }
    });

    document.getElementById("findInput").addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const value = event.target.value.trim();
        if (value) {
          findNode(parseInt(value));
          event.target.value = '';
        }
      }
    });
    
    const inputField = document.getElementById("arrayInput");

    async function processValues() {
      // Split the input value on spaces or commas, trim and filter out empty strings
      const valuesArray = inputField.value
        .split(/[\s,]+/)
        .map(item => item.trim())
        .filter(item => item !== '');
      for (const value of valuesArray) {
        // Wait for insertNode to complete before processing the next value
        await insertNode(parseInt(value));
      }
    }

    inputField.addEventListener('keypress', async function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();  // Prevent default form submission behavior
        await processValues();
        event.target.value = '';
      }
    }
    );

    document.getElementById("zoomIn").addEventListener('click', () => {
      let currentScale = stage.scaleX();
      let newScale = currentScale * 1.1; // increase by 10%
      stage.scale({ x: newScale, y: newScale });
      stage.draw();
    });

    document.getElementById("zoomOut").addEventListener('click', () => {
      let currentScale = stage.scaleX();
      let newScale = currentScale / 1.1; // decrease by 10%
      stage.scale({ x: newScale, y: newScale });
      stage.draw();
    });

    // ------------------ AVL Tree Insertion with Animation ------------------
   
    // Recalculate positions and redraw on window resize so that the root remains centered.
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
 