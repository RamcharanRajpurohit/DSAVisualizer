import { stage, layer } from 'konva_setup';
import { redrawTree } from 'draw_bst';
import { insertNode } from 'bst_operations';
import { findNode ,deleteNode} from 'bst_operations';
    
    
    function tearDown() {
        // Stop all animations first
        animations.forEach(anim => anim?.stop());
        animations.clear();
        
        // Then clean up other elements
        _.invoke(this._tweens, 'destroy');
        _.invoke(this._layers, 'destroy');
      }
      
    // ------------------ Input and Zoom Button Event Listeners ------------------
    document.getElementById("nodeInput").addEventListener('keypress', async(event) => {
      if (event.key === 'Enter') {
        const value = event.target.value.trim();
        if (value) {
           await insertNode(parseInt(value));
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
      console.log(`yes ${value}`);
      // Wait for insertNode to complete before processing the next value
      await insertNode(parseInt(value));
    }
    console.log("no");
  }

  inputField.addEventListener('keypress', async function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();  // Prevent default form submission behavior
      await processValues();
      event.target.value = '';
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
 