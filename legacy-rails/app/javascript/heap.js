Konva.pixelRatio = 1;
const container = document.getElementById('container');
const width = container.clientWidth;
const height = container.clientHeight;
const stage = new Konva.Stage({ container: 'container', width, height });
const layer = new Konva.Layer();
stage.add(layer);

function updateStatus(text) { document.getElementById('statusText').textContent = text; }

function updateArrayView(array) {
    const arrayView = document.getElementById('arrayView');
    arrayView.innerHTML = '';
    array.forEach((value, index) => {
        const el = document.createElement('div');
        el.className = 'array-element';
        el.textContent = value;
        if (index === 0) el.style.backgroundColor = '#ff9800';
        arrayView.appendChild(el);
    });
}

class OptimizedHeap {
    constructor(isMinHeap = false) {
        this.heap = [];
        this.nodeGroups = {};
        this.edgeLines = {};
        this.positions = [];
        this.nodeRadius = 30;
        this.isMinHeap = isMinHeap;
        this.isBuild = false;
    }

    getParentIndex(i) { return Math.floor((i - 1) / 2); }
    getLeftChildIndex(i) { return 2 * i + 1; }
    getRightChildIndex(i) { return 2 * i + 2; }
    swap(i, j) { [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]]; }
    compareValues(a, b) { return this.isMinHeap ? a < b : a > b; }

    calculateNodePositions(maxCapacity = 31) {
        const positions = [], startY = 80, startX = width / 2;
        const maxDepth = Math.floor(Math.log2(maxCapacity));
        const nodesInDeepestLevel = Math.pow(2, maxDepth);
        const minNodeSpacing = Math.max(this.nodeRadius * 2.5, width * 0.2);
        const totalWidthNeeded = nodesInDeepestLevel * minNodeSpacing;

        for (let i = 0; i < maxCapacity; i++) {
            const level = Math.floor(Math.log2(i + 1));
            const nodesInLevel = Math.pow(2, level);
            const levelWidth = Math.min(width * 0.9, totalWidthNeeded / Math.pow(2, maxDepth - level));
            const nodeSpacing = levelWidth / nodesInLevel;
            const levelStartX = startX - (levelWidth / 2) + (nodeSpacing / 2);
            const positionInLevel = i - Math.pow(2, level) + 1;
            const x = levelStartX + positionInLevel * nodeSpacing;
            const y = startY + level * height * 0.2;
            positions.push({ x, y });
        }
        return positions;
    }

    createNode(index, position, skipAnimation = false) {
        const group = new Konva.Group({ x: position.x, y: position.y, opacity: skipAnimation ? 1 : 0 });
        const rootColor = this.isMinHeap ? '#2196F3' : '#ff9800';
        const nodeColor = this.isMinHeap ? '#03A9F4' : '#4CAF50';

        group.add(new Konva.Circle({ radius: this.nodeRadius, fill: index === 0 ? rootColor : nodeColor, stroke: '#333', strokeWidth: 2 }));
        group.add(new Konva.Text({ text: this.heap[index].toString(), fontSize: 18, fontFamily: 'Arial', fontStyle: 'bold', fill: 'white', align: 'center', verticalAlign: 'middle', x: -this.nodeRadius, y: -9, width: this.nodeRadius * 2 }));
        group.add(new Konva.Text({ text: `[${index}]`, fontSize: 14, fontFamily: 'Arial', fill: '#333', align: 'center', x: -this.nodeRadius, y: this.nodeRadius + 5, width: this.nodeRadius * 2 }));

        layer.add(group);
        this.nodeGroups[index] = group;

        if (!skipAnimation) {
            return new Promise(resolve => {
                new Konva.Tween({ node: group, duration: 0.5, opacity: 1, easing: Konva.Easings.ElasticEaseOut, onFinish: resolve }).play();
            });
        }
        return Promise.resolve();
    }

    createEdge(parentIndex, childIndex, skipAnimation = false) {
        const edgeKey = `${parentIndex}-${childIndex}`;
        if (this.edgeLines[edgeKey]) return Promise.resolve();

        const parentPos = this.positions[parentIndex];
        const childPos = this.positions[childIndex];
        const edge = new Konva.Line({ points: [parentPos.x, parentPos.y, childPos.x, childPos.y], stroke: '#666', strokeWidth: 2, opacity: skipAnimation ? 1 : 0 });

        layer.add(edge);
        edge.moveToBottom();
        this.edgeLines[edgeKey] = edge;

        if (!skipAnimation) {
            return new Promise(resolve => {
                new Konva.Tween({ node: edge, duration: 0.3, opacity: 1, easing: Konva.Easings.EaseInOut, onFinish: resolve }).play();
            });
        }
        return Promise.resolve();
    }

    async removeNode(index) {
        const node = this.nodeGroups[index];
        if (!node) return Promise.resolve();

        const edges = [
            index > 0 ? `${this.getParentIndex(index)}-${index}` : null,
            `${index}-${this.getLeftChildIndex(index)}`,
            `${index}-${this.getRightChildIndex(index)}`
        ];
        const edgeObjects = edges.filter(key => key && this.edgeLines[key]).map(key => this.edgeLines[key]);

        const circle = node.findOne('Circle');
        const originalFill = circle.fill();

        for (let i = 0; i < 3; i++) {
            await new Promise(resolve => {
                circle.fill('#ff1744');
                edgeObjects.forEach(edge => edge.stroke('#ff1744'));
                layer.batchDraw();
                setTimeout(() => {
                    circle.fill(originalFill);
                    edgeObjects.forEach(edge => edge.stroke('#666'));
                    layer.batchDraw();
                    setTimeout(resolve, 150);
                }, 150);
            });
        }

        return new Promise(resolve => {
            const duration = 0.6;
            new Konva.Tween({ node: node, duration: duration, scaleX: 0.3, scaleY: 0.3, opacity: 0, easing: Konva.Easings.EaseIn }).play();
            edgeObjects.forEach(edge => {
                new Konva.Tween({ node: edge, duration: duration, opacity: 0, strokeWidth: 0, easing: Konva.Easings.EaseIn }).play();
            });

            setTimeout(() => {
                edges.forEach(key => {
                    if (key && this.edgeLines[key]) {
                        this.edgeLines[key].destroy();
                        delete this.edgeLines[key];
                    }
                });
                node.destroy();
                delete this.nodeGroups[index];
                layer.batchDraw();
                resolve();
            }, duration * 1000);
        });
    }

    updateNodeText(index) {
        const node = this.nodeGroups[index];
        if (!node) return;
        node.findOne('Text').text(this.heap[index].toString());
        node.children[2].text(`[${index}]`);
    }

    updateNodeColor(index, isRoot = false) {
        const node = this.nodeGroups[index];
        if (!node) return;
        const rootColor = this.isMinHeap ? '#2196F3' : '#ff9800';
        const nodeColor = this.isMinHeap ? '#03A9F4' : '#4CAF50';
        node.findOne('Circle').fill(isRoot ? rootColor : nodeColor);
    }

    async heapBuild() {
        for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
            if (animationPaused) break;
            updateStatus(`Heapifying down from index ${i}`);
            await this.heapifyDown(i);
        }
    }

    async swapNodes(index1, index2) {
        const node1 = this.nodeGroups[index1];
        const node2 = this.nodeGroups[index2];
        if (!node1 || !node2) return;

        const pos1 = { x: node1.x(), y: node1.y() };
        const pos2 = { x: node2.x(), y: node2.y() };

        node1.findOne('Circle').fill('#ff5722');
        node2.findOne('Circle').fill('#ff5722');
        layer.batchDraw();

        return new Promise(resolve => {
            new Konva.Tween({ node: node1, duration: 0.8, x: pos2.x, y: pos2.y, easing: Konva.Easings.EaseInOut }).play();
            new Konva.Tween({
                node: node2, duration: 0.8, x: pos1.x, y: pos1.y, easing: Konva.Easings.EaseInOut,
                onFinish: () => {
                    [this.nodeGroups[index1], this.nodeGroups[index2]] = [this.nodeGroups[index2], this.nodeGroups[index1]];
                    this.updateNodeColor(index1, index1 === 0);
                    this.updateNodeColor(index2, index2 === 0);
                    this.updateNodeText(index1);
                    this.updateNodeText(index2);
                    layer.batchDraw();
                    setTimeout(resolve, 200);
                }
            }).play();
        });
    }

    highlightNode(index, color, duration = 1) {
        const node = this.nodeGroups[index];
        if (!node) return Promise.resolve();

        const circle = node.findOne('Circle');
        const originalFill = circle.fill();
        circle.fill(color);
        layer.batchDraw();

        return new Promise(resolve => {
            setTimeout(() => {
                new Konva.Tween({ node: circle, duration: 0.4, fill: originalFill, easing: Konva.Easings.EaseOut, onFinish: resolve }).play();
            }, duration * 1000);
        });
    }

    compareNodes(index1, index2) {
        const node1 = this.nodeGroups[index1];
        const node2 = this.nodeGroups[index2];
        if (!node1 || !node2) return Promise.resolve();

        const circle1 = node1.findOne('Circle');
        const circle2 = node2.findOne('Circle');
        const originalFill1 = circle1.fill();
        const originalFill2 = circle2.fill();

        circle1.fill('#ffeb3b');
        circle2.fill('#ffeb3b');
        layer.batchDraw();

        return new Promise(resolve => {
            setTimeout(() => {
                circle1.fill(originalFill1);
                circle2.fill(originalFill2);
                layer.batchDraw();
                setTimeout(resolve, 200);
            }, 800);
        });
    }

    async insert(value) {
        const heapType = this.isMinHeap ? "min heap" : "max heap";
        updateStatus(`Inserting ${value} at the end of the ${heapType}`);

        this.heap.push(value);
        const insertIndex = this.heap.length - 1;

        if (this.positions.length === 0) this.positions = this.calculateNodePositions();

        await this.createNode(insertIndex, this.positions[insertIndex]);
        if (insertIndex > 0) await this.createEdge(this.getParentIndex(insertIndex), insertIndex);
        await this.highlightNode(insertIndex, '#e91e63', 1);
        updateStatus(`New value ${value} added at position ${insertIndex}`);
        await this.heapifyUp(insertIndex);
        updateArrayView(this.heap);
        const optimalValue = this.isMinHeap ? "minimum" : "maximum";
        updateStatus(`Insertion complete. ${heapType.charAt(0).toUpperCase() + heapType.slice(1)} property restored with ${optimalValue} at root.`);
    }

    async heapifyUp(index) {
        let currentIndex = index;
        let parentIndex = this.getParentIndex(currentIndex);

        while (currentIndex > 0 && this.compareValues(this.heap[currentIndex], this.heap[parentIndex])) {
            const compareSymbol = this.isMinHeap ? "<" : ">";
            updateStatus(`${this.heap[currentIndex]} ${compareSymbol} ${this.heap[parentIndex]}, swapping positions ${currentIndex} and ${parentIndex}`);
            await this.compareNodes(currentIndex, parentIndex);
            this.swap(currentIndex, parentIndex);
            await this.swapNodes(currentIndex, parentIndex);
            currentIndex = parentIndex;
            parentIndex = this.getParentIndex(currentIndex);
        }

        if (currentIndex === 0) {
            const rootColor = this.isMinHeap ? '#2196F3' : '#ff9800';
            await this.highlightNode(0, rootColor, 1);
            const optimalType = this.isMinHeap ? "minimum" : "maximum";
            updateStatus(`Value ${this.heap[0]} is now the new ${optimalType} at the root`);
        }
    }

    async extractRoot() {
        this.isBuild = false;
        if (this.heap.length === 0) {
            updateStatus("Heap is empty. Nothing to extract.");
            return null;
        }

        const optimalValue = this.heap[0];
        const optimalType = this.isMinHeap ? "minimum" : "maximum";
        updateStatus(`Extracting ${optimalType} value ${optimalValue} from the root`);
        await this.highlightNode(0, '#f44336', 1);

        if (this.heap.length === 1) {
            this.heap.pop();
            await this.removeNode(0);
            updateArrayView(this.heap);
            updateStatus("Heap is now empty.");
            return optimalValue;
        }

        const lastIndex = this.heap.length - 1;
        const lastValue = this.heap[lastIndex];
        await this.highlightNode(lastIndex, '#e91e63', 1);
        updateStatus(`Last element ${lastValue} will replace the root`);

        this.swap(0, lastIndex);
        await this.swapNodes(0, lastIndex);

        await this.removeNode(lastIndex);
        this.heap.pop();
        updateArrayView(this.heap);

        const rootColor = this.isMinHeap ? '#2196F3' : '#ff9800';
        await this.highlightNode(0, rootColor, 1);
        await this.heapifyDown(0);

        const heapType = this.isMinHeap ? "min heap" : "max heap";
        updateStatus(`Extraction complete. ${heapType.charAt(0).toUpperCase() + heapType.slice(1)} property restored.`);
        this.isBuild = true;
        return optimalValue;
    }

    async heapifyDown(index) {
        let currentIndex = index;

        while (true) {
            let optimalIndex = currentIndex;
            const leftIndex = this.getLeftChildIndex(currentIndex);
            const rightIndex = this.getRightChildIndex(currentIndex);
            const compareSymbol = this.isMinHeap ? "<" : ">";

            if (leftIndex < this.heap.length) {
                await this.compareNodes(optimalIndex, leftIndex);
                updateStatus(`Compare: ${this.heap[leftIndex]} ${compareSymbol} ${this.heap[optimalIndex]}?`);
                if (this.compareValues(this.heap[leftIndex], this.heap[optimalIndex])) optimalIndex = leftIndex;
            }

            if (rightIndex < this.heap.length) {
                await this.compareNodes(optimalIndex, rightIndex);
                updateStatus(`Compare: ${this.heap[rightIndex]} ${compareSymbol} ${this.heap[optimalIndex]}?`);
                if (this.compareValues(this.heap[rightIndex], this.heap[optimalIndex])) optimalIndex = rightIndex;
            }

            if (optimalIndex !== currentIndex) {
                updateStatus(`${this.heap[optimalIndex]} ${compareSymbol} ${this.heap[currentIndex]}, swapping positions ${optimalIndex} and ${currentIndex}`);
                this.swap(currentIndex, optimalIndex);
                await this.swapNodes(currentIndex, optimalIndex);
                currentIndex = optimalIndex;
            } else break;
        }
    }

    async buildHeap(array) {
        await this.clear();
        this.heap = [...array];
        updateArrayView(this.heap);
        const heapType = this.isMinHeap ? "min heap" : "max heap";
        updateStatus(`Building a ${heapType} from the array`);

        if (this.positions.length === 0) this.positions = this.calculateNodePositions();
        await this.initialVisualize();
    }

    async heapSort() {
        if (!heap.isBuild) {
            alert(`Please wait, the ${this.isMinHeap ? "Min" : "Max"} heap is building...`);
            await heap.heapBuild();
            heap.isBuild = true;
        }
        if (this.heap.length <= 1) {
            updateStatus("Array already sorted (0 or 1 elements)");
            return [...this.heap];
        }

        const sortedArray = [];
        let arrayView = document.getElementById('sortedArrayView');

        if (!arrayView) {
            arrayView = document.createElement('div');
            arrayView.id = 'sortedArrayView';
            arrayView.className = 'array-view';
            arrayView.style.backgroundColor = '#151515';
            const mainArrayView = document.getElementById('arrayView');
            mainArrayView.parentNode.insertBefore(arrayView, mainArrayView.nextSibling);
        }

        updateStatus("Starting heap sort...");
        const ascendingOrder = !this.isMinHeap;
        updateStatus(`Using ${this.isMinHeap ? "min heap" : "max heap"} to sort in ${ascendingOrder ? "ascending" : "descending"} order`);

        const heapSize = this.heap.length;
        for (let i = 0; i < heapSize; i++) {
            if (this.heap.length === 0) break;
            const extractedValue = await this.extractRoot();
            if (extractedValue !== null && extractedValue !== undefined) {
                sortedArray.push(extractedValue);
                updateSortedArrayView(sortedArray, ascendingOrder);
                updateStatus(`Extracted ${extractedValue}, ${this.heap.length} elements remaining`);
            }
        }

        updateStatus(`Heap sort complete! Array sorted in ${ascendingOrder ? "ascending" : "descending"} order`);
        return sortedArray;
    }

    async initialVisualize() {
        layer.destroyChildren();
        this.nodeGroups = {};
        this.edgeLines = {};

        if (this.heap.length === 0) {
            layer.batchDraw();
            return;
        }

        for (let i = 0; i < this.heap.length; i++) {
            const leftChildIndex = this.getLeftChildIndex(i);
            const rightChildIndex = this.getRightChildIndex(i);
            if (leftChildIndex < this.heap.length) await this.createEdge(i, leftChildIndex, true);
            if (rightChildIndex < this.heap.length) await this.createEdge(i, rightChildIndex, true);
        }

        for (let i = 0; i < this.heap.length; i++) {
            await this.createNode(i, this.positions[i], true);
        }

        return new Promise(resolve => {
            layer.opacity(0);
            layer.visible(true);
            layer.batchDraw();
            new Konva.Tween({ node: layer, duration: 0.8, opacity: 1, easing: Konva.Easings.EaseInOut, onFinish: resolve }).play();
        });
    }

    async clear() {
        this.heap = [];
        if (layer.children.length > 0) {
            await new Promise(resolve => {
                new Konva.Tween({
                    node: layer, duration: 0.5, opacity: 0, easing: Konva.Easings.EaseOut,
                    onFinish: () => {
                        layer.destroyChildren();
                        this.nodeGroups = {};
                        this.edgeLines = {};
                        layer.opacity(1);
                        layer.batchDraw();
                        resolve();
                    }
                }).play();
            });
        } else {
            layer.destroyChildren();
            this.nodeGroups = {};
            this.edgeLines = {};
            layer.batchDraw();
        }

        updateArrayView([]);
        const sortedArrayView = document.getElementById('sortedArrayView');
        if (sortedArrayView) sortedArrayView.innerHTML = '';
        updateStatus("Heap cleared");
    }

    async toggleHeapType() {
        this.isMinHeap = !this.isMinHeap;
        const heapType = this.isMinHeap ? "min heap" : "max heap";
        updateStatus(`Switched to ${heapType}`);
        const toggleButton = document.getElementById('toggleHeapBtn');
        if (toggleButton) {
            toggleButton.textContent = `Switch to ${this.isMinHeap ? "Max" : "Min"} Heap`;
            toggleButton.style.backgroundColor = this.isMinHeap ? '#4CAF50' : '#2196F3';
        }

        const extractBtn = document.getElementById('extractRootBtn');
        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.textContent = `Build ${this.isMinHeap ? "Min" : "Max"} Heap`;
        if (extractBtn) extractBtn.textContent = `Extract ${this.isMinHeap ? "Min" : "Max"}`;
        if (this.heap.length > 0) {
            const currentHeap = [...this.heap];
            await this.buildHeap(currentHeap);
        }
    }
}

function updateSortedArrayView(array, ascending = true) {
    const sortedArrayView = document.getElementById('sortedArrayView');
    if (!sortedArrayView) return;

    sortedArrayView.innerHTML = '<h3>Sorted Array:</h3>';
    array.forEach((value) => {
        const element = document.createElement('div');
        element.className = 'array-element';
        element.textContent = value;
        const hue = ascending ? 120 - (value / 100 * 120) : (value / 100 * 120);
        element.style.backgroundColor = `hsl(${hue}, 80%, 45%)`;
        sortedArrayView.appendChild(element);
    });
}

const heap = new OptimizedHeap(false);
let isOperating = false;
let animationPaused = false;

async function withLock(operation) {
    if (isOperating) {
        alert("⏳ Please wait! Another operation is currently running.");
        return;
    }
    isOperating = true;
    try {
        await operation();
    } finally {
        isOperating = false;
    }
}

document.getElementById('insertBtn').addEventListener('click', () => withLock(async () => {
    const valueInput = document.getElementById('valueInput');
    const value = parseInt(valueInput.value);
    if (!isNaN(value)) {
        if (!heap.isBuild) {
            alert(`Please wait, the ${heap.isMinHeap ? "Min" : "Max"} heap is building...`);
            await heap.heapBuild();
            heap.isBuild = true;
        }
        await heap.insert(value);
        valueInput.value = '';
    } else updateStatus("Please enter a valid number");
}));

document.getElementById('extractRootBtn').addEventListener('click', () => withLock(async () => {
    if (!heap.isBuild) {
        alert(`Please wait, the ${heap.isMinHeap ? "Min" : "Max"} heap is building...`);
        await heap.heapBuild();
        heap.isBuild = true;
    }
    await heap.extractRoot();
}));

document.getElementById('buildHeapBtn').addEventListener('click', () => withLock(async () => {
    const randomArray = Array.from({ length: 7 }, () => Math.floor(Math.random() * 100));
    updateStatus(`Generated random array: [${randomArray.join(', ')}]`);
    await heap.buildHeap(randomArray);
}));

document.getElementById('heapSortBtn').addEventListener('click', () => withLock(async () => {
    await heap.heapSort();
}));

document.getElementById('toggleHeapBtn').addEventListener('click', () => withLock(async () => {
    await heap.toggleHeapType();
}));

document.getElementById('clearBtn').addEventListener('click', () => withLock(async () => {
    await heap.clear();
}));

const playBtn = document.getElementById('playBtn');

playBtn.addEventListener('click', async () => {
    if (isOperating) {
        alert("⏳ Please wait! Another operation is currently running.");
        return;
    }
    
    isOperating = true;
    animationPaused = false;
    playBtn.innerHTML = `<i class="fas fa-pause"></i> Pause`;
    updateStatus("Building heap...");
    await heap.heapBuild();
    const heapType = heap.isMinHeap ? "min heap" : "max heap";
    updateStatus(`${heapType.charAt(0).toUpperCase() + heapType.slice(1)} built successfully`);
    updateArrayView(heap.heap);
    heap.isBuild = true;
    playBtn.innerHTML = `<i class="fas fa-play"></i> Build ${heapType} Heap`;
    isOperating = false;
});

window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    stage.width(newWidth);
    stage.height(newHeight);
    if (heap && heap.heap.length > 0) {
        heap.positions = heap.calculateNodePositions();
        heap.initialVisualize();
    }
});

(async function init() {
    const initialArray = [45, 30, 60, 10, 20, 50, 70];
    updateStatus(`Initializing with array: [${initialArray.join(', ')}]`);
    await heap.buildHeap(initialArray);
})();