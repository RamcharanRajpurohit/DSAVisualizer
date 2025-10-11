// Constants
const COLORS = ['#FF9999', '#99FF99', '#9999FF', '#FFFF99', '#FF99FF', '#99FFFF'];

// Stack configuration
const STACK_CONFIG = {
    maxItems: 18,
    itemWidth: 120,
    itemHeight: 50,
    itemMargin: 5,
    virtualWidth: 800,
    virtualHeight: 1200
};

// Queue configuration
const QUEUE_CONFIG = {
    maxItems: 20,
    itemWidth: 60,
    itemHeight: 40,
    itemMargin: 2,
    virtualWidth: 1500,
    virtualHeight: 500
};

// State
let stack = [], queue = [], currentStructure = 'stack';

// Initialize Konva
const stage = new Konva.Stage({
    container: 'canvasContainer',
    width: STACK_CONFIG.virtualWidth,
    height: STACK_CONFIG.virtualHeight
});
const layer = new Konva.Layer();
stage.add(layer);

// DOM elements
const els = {
    toggle: document.getElementById('structureToggle'),
    title: document.getElementById('structureTitle'),
    push: document.getElementById('pushBtn'),
    pop: document.getElementById('popBtn'),
    input: document.getElementById('valueInput'),
    stackExp: document.getElementById('stackExplanation'),
    queueExp: document.getElementById('queueExplanation')
};

// Get current config and data
const getConfig = () => currentStructure === 'stack' ? STACK_CONFIG : QUEUE_CONFIG;
const getData = () => currentStructure === 'stack' ? stack : queue;
const getMaxItems = () => getConfig().maxItems;

// Resize stage based on structure
function resizeStage() {
    const config = getConfig();
    stage.width(config.virtualWidth);
    stage.height(config.virtualHeight);
    fitStageIntoContainer();
}

// Draw stack visualization
function drawStack() {
    layer.destroyChildren();
    const config = STACK_CONFIG;
    const baseWidth = config.itemWidth + 20;
    const baseX = config.virtualWidth / 2 - baseWidth / 2;
    const baseY = config.virtualHeight - 50;
    const wallHeight = config.virtualHeight - 100;
    
    // Draw base and walls
    layer.add(
        new Konva.Rect({ x: baseX, y: baseY, width: baseWidth, height: 10, fill: '#333', cornerRadius: 2 }),
        new Konva.Rect({ x: baseX, y: baseY - wallHeight, width: 5, height: wallHeight, fill: '#333', cornerRadius: 2 }),
        new Konva.Rect({ x: baseX + baseWidth - 5, y: baseY - wallHeight, width: 5, height: wallHeight, fill: '#333', cornerRadius: 2 })
    );
    
    // Draw items
    stack.forEach((value, i) => {
        const y = baseY - ((i + 1) * (config.itemHeight + config.itemMargin));
        if (y >= 30) { // Prevent overflow
            layer.add(
                new Konva.Rect({ x: baseX + 10, y, width: config.itemWidth, height: config.itemHeight, 
                    fill: COLORS[i % COLORS.length], stroke: '#333', strokeWidth: 2, cornerRadius: 5 }),
                new Konva.Text({ x: baseX + 10, y: y + config.itemHeight / 3, width: config.itemWidth, 
                    text: value, fontSize: 20, fontFamily: 'Arial', fill: '#333', align: 'center', fontStyle: 'bold' })
            );
        }
    });
    
    // Add TOP label
    if (stack.length > 0) {
        const topY = Math.max(30, baseY - (stack.length * (config.itemHeight + config.itemMargin)));
        layer.add(new Konva.Text({ x: baseX + baseWidth + 15, y: topY + 10, 
            text: 'TOP', fontSize: 18, fontFamily: 'Arial', fill: '#FF0000', fontStyle: 'bold' }));
    }
    
    layer.draw();
}

// Draw queue visualization
function drawQueue() {
    layer.destroyChildren();
    const config = QUEUE_CONFIG;
    const baseWidth = config.virtualWidth - 100;
    const baseX = 50;
    const baseY = config.virtualHeight / 2 + 50;
    const maxVisibleItems = Math.floor(baseWidth / (config.itemWidth + config.itemMargin));
    
    // Draw base and labels
    layer.add(
        new Konva.Rect({ x: baseX, y: baseY, width: baseWidth, height: 5, fill: '#333', cornerRadius: 2 }),
        new Konva.Text({ x: baseX, y: baseY + 15, text: 'FRONT', fontSize: 18, fontFamily: 'Arial', fill: '#00FF00', fontStyle: 'bold' }),
        new Konva.Text({ x: baseX + baseWidth - 50, y: baseY + 15, text: 'BACK', fontSize: 18, fontFamily: 'Arial', fill: '#0000FF', fontStyle: 'bold' })
    );
    
    // Draw items (only visible ones)
    const visibleQueue = queue.slice(0, maxVisibleItems);
    visibleQueue.forEach((value, i) => {
        const x = baseX + (i * (config.itemWidth + config.itemMargin));
        layer.add(
            new Konva.Rect({ x, y: baseY - config.itemHeight - 10, width: config.itemWidth, height: config.itemHeight, 
                fill: COLORS[i % COLORS.length], stroke: '#333', strokeWidth: 2, cornerRadius: 5 }),
            new Konva.Text({ x, y: baseY - config.itemHeight + 10, width: config.itemWidth, 
                text: value, fontSize: 16, fontFamily: 'Arial', fill: '#333', align: 'center', fontStyle: 'bold' })
        );
    });
    
    // Add REAR label
    if (visibleQueue.length > 0) {
        const rearIndex = Math.min(queue.length - 1, maxVisibleItems - 1);
        const rearX = baseX + (rearIndex * (config.itemWidth + config.itemMargin)) + config.itemWidth / 2 - 20;
        layer.add(new Konva.Text({ x: rearX, y: baseY - config.itemHeight - 35, 
            text: 'REAR', fontSize: 18, fontFamily: 'Arial', fill: '#FF0000', fontStyle: 'bold' }));
    }
    
    layer.draw();
}

// Operations
const push = () => {
    const value = els.input.value.trim();
    const maxItems = getMaxItems();
    if (!value || getData().length >= maxItems){
         alert(`${currentStructure} is full`)
          return;
    } 
    getData().push(value);
    currentStructure === 'stack' ? drawStack() : drawQueue();
    els.input.value = '';
};

const pop = () => {
    if (getData().length === 0) return;
    currentStructure === 'stack' ? stack.pop() : queue.shift();
    currentStructure === 'stack' ? drawStack() : drawQueue();
};

const addRandom = () => {
    els.input.value = Math.floor(Math.random() * 100);
    push();
};

const clearStructure = () => {
    currentStructure === 'stack' ? (stack = [], drawStack()) : (queue = [], drawQueue());
};

const preload = () => {
    clearStructure();
    getData().push(10, 20, 30, 40, 50);
    currentStructure === 'stack' ? drawStack() : drawQueue();
};

const toggleStructure = () => {
    currentStructure = els.toggle.checked ? 'queue' : 'stack';
    els.title.textContent = currentStructure.charAt(0).toUpperCase() + currentStructure.slice(1);
    els.push.textContent = currentStructure === 'stack' ? 'Push' : 'Enqueue';
    els.pop.textContent = currentStructure === 'stack' ? 'Pop' : 'Dequeue';
    els.stackExp.style.display = currentStructure === 'stack' ? 'block' : 'none';
    els.queueExp.style.display = currentStructure === 'stack' ? 'none' : 'block';
    
    // Resize stage and redraw
    resizeStage();
    currentStructure === 'stack' ? drawStack() : drawQueue();
};

// Responsive canvas
const fitStageIntoContainer = () => {
    const container = document.getElementById('canvasContainer');
    const config = getConfig();
    const scale = Math.min(container.offsetWidth / config.virtualWidth, container.offsetHeight / config.virtualHeight);
    stage.width(config.virtualWidth * scale);
    stage.height(config.virtualHeight * scale);
    stage.scale({ x: scale, y: scale });
    stage.draw();
};

// Initialize
drawStack();
fitStageIntoContainer();

els.toggle.addEventListener('change', toggleStructure);
els.push.addEventListener('click', push);
els.pop.addEventListener('click', pop);
document.getElementById('randomBtn').addEventListener('click', addRandom);
document.getElementById('clearBtn').addEventListener('click', clearStructure);
document.getElementById('preloadBtn').addEventListener('click', preload);
window.addEventListener('resize', fitStageIntoContainer);
els.input.addEventListener('keyup', e => e.key === 'Enter' && push());