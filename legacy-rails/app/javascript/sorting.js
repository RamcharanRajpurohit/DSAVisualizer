// Variables
let arraySize = 20, array = [], bars = [], animationSpeed = 50, sorting = false;
let stage, layer, width, height, currentAlgorithm = "bubble";
let iPointer = -1, jPointer = -1, pivotIndex = -1, auxiliaryArray = [];

const algorithmInfo = {
    bubble: { title: "Bubble Sort", description: "Repeatedly steps through the list, compares adjacent elements, and swaps them if in wrong order.", complexity: "Time: O(n²) | Space: O(1)" },
    selection: { title: "Selection Sort", description: "Finds minimum element from unsorted sublist and moves it to sorted sublist.", complexity: "Time: O(n²) | Space: O(1)" },
    insertion: { title: "Insertion Sort", description: "Builds sorted array one item at a time by inserting elements into correct position.", complexity: "Time: O(n²) | Space: O(1)" },
    merge: { title: "Merge Sort", description: "Divide and conquer algorithm that divides array, recursively sorts, then merges.", complexity: "Time: O(n log n) | Space: O(n)" },
    quick: { title: "Quick Sort", description: "Picks pivot element and partitions array around it.", complexity: "Time: O(n log n) avg, O(n²) worst | Space: O(log n)" }
};

function setupStage() {
    width = Math.min(window.innerWidth - 40, 1000);
    height = 350;
    if (stage) stage.destroy();
    stage = new Konva.Stage({ container: 'container', width, height });
    layer = new Konva.Layer();
    stage.add(layer);
    layer.add(new Konva.Rect({ x: 0, y: 0, width, height, fill: 'rgba(18, 18, 18, 0.5)' }));
}

function generateArray() {
    array = Array.from({ length: arraySize }, () => Math.floor(Math.random() * 100) + 1);
    auxiliaryArray = [...array];
    visualizeArray();
    updateCurrentStep("Array generated. Ready to sort.");
}

function visualizeArray() {
    bars.forEach(bar => bar.destroy());
    bars = [];
    const barWidth = Math.max((width - 40) / arraySize - 2, 3);
    const spacing = Math.min(2, barWidth * 0.2);
    const maxBarHeight = height - 100;
    
    array.forEach((val, i) => {
        const barHeight = Math.max((val / 100) * maxBarHeight, 5);
        const bar = new Konva.Group({ x: 20 + i * (barWidth + spacing), y: height - 50 - barHeight });
        
        bar.add(new Konva.Rect({ width: barWidth, height: barHeight, fill: 'var(--unsorted)', stroke: '#0099CC', strokeWidth: 1, cornerRadius: 2 }));
        bar.add(new Konva.Text({ text: val.toString(), fontSize: Math.min(14, barWidth - 4), fontFamily: 'Arial', fill: 'white', width: barWidth, align: 'center', y: barHeight + 5 }));
        
        ['i', 'j', 'p'].forEach((label, idx) => {
            bar.add(new Konva.Text({ text: label, fontSize: 16, fontFamily: 'Arial', fill: ['#FFC107', '#FF5733', '#9C27B0'][idx], width: barWidth, align: 'center', y: -25, visible: false, fontStyle: 'bold' }));
        });
        
        layer.add(bar);
        bars.push(bar);
    });
    layer.draw();
}

function updatePointers() {
    bars.forEach((bar, i) => {
        if (bar) {
            bar.findOne('Text[text="i"]')?.visible(i === iPointer);
            bar.findOne('Text[text="j"]')?.visible(i === jPointer);
            bar.findOne('Text[text="p"]')?.visible(i === pivotIndex);
        }
    });
    layer.draw();
}

function updateCurrentStep(step) {
    document.getElementById('current-step').textContent = "Current Step: " + step;
}

function updateAlgorithmInfo(algorithm) {
    const info = algorithmInfo[algorithm];
    document.getElementById('algorithm-title').textContent = info.title;
    document.getElementById('algorithm-description').textContent = info.description;
    document.getElementById('algorithm-complexity').textContent = info.complexity;
}

async function animateSwap(i, j) {
    return new Promise(resolve => {
        const [barI, barJ] = [bars[i], bars[j]];
        const [targetXI, targetXJ] = [barJ.x(), barI.x()];
        
        [barI, barJ].forEach(bar => bar.findOne('Rect')?.fill('#FF5733'));
        layer.draw();
        
        const createTween = (bar, targetX, isLast) => new Konva.Tween({
            node: bar, duration: animationSpeed / 1000, x: targetX,
            onFinish: () => {
                bar.findOne('Rect')?.fill('var(--unsorted)');
                layer.draw();
                if (isLast) {
                    if (i >= 0 && i < bars.length && j >= 0 && j < bars.length) [bars[i], bars[j]] = [bars[j], bars[i]];
                    setTimeout(resolve, animationSpeed / 2);
                }
            }
        });
        
        createTween(barI, targetXI, false).play();
        createTween(barJ, targetXJ, true).play();
    });
}

async function bubbleSort() {
    for (let i = 0; i < array.length; i++) {
        for (let j = 0; j < array.length - i - 1; j++) {
            if (!sorting) return;
            iPointer = j; jPointer = j + 1; updatePointers();
            bars[j].findOne('Rect').fill('#FFC107');
            bars[j + 1].findOne('Rect').fill('#FF5733');
            layer.draw();
            updateCurrentStep(`Comparing ${array[j]} and ${array[j+1]}`);
            await new Promise(r => setTimeout(r, animationSpeed));
            
            if (array[j] > array[j + 1]) {
                updateCurrentStep(`Swapping ${array[j]} and ${array[j+1]}`);
                [array[j], array[j + 1]] = [array[j + 1], array[j]];
                await animateSwap(j, j + 1);
            } else {
                bars[j].findOne('Rect').fill('var(--unsorted)');
                bars[j + 1].findOne('Rect').fill('var(--unsorted)');
                layer.draw();
            }
        }
        bars[array.length - i - 1].findOne('Rect').fill('#4CAF50');
        layer.draw();
    }
    finishSort();
}

async function selectionSort() {
    for (let i = 0; i < array.length - 1; i++) {
        let minIndex = i;
        iPointer = i; pivotIndex = minIndex; updatePointers();
        bars[i].findOne('Rect').fill('#FFC107');
        layer.draw();
        updateCurrentStep(`Finding minimum in unsorted portion starting at ${i}`);
        await new Promise(r => setTimeout(r, animationSpeed));
        
        for (let j = i + 1; j < array.length; j++) {
            if (!sorting) return;
            jPointer = j; updatePointers();
            bars[j].findOne('Rect').fill('#FF5733');
            layer.draw();
            updateCurrentStep(`Comparing ${array[minIndex]} with ${array[j]}`);
            await new Promise(r => setTimeout(r, animationSpeed));
            
            if (array[j] < array[minIndex]) {
                if (minIndex !== i) bars[minIndex].findOne('Rect').fill('var(--unsorted)');
                minIndex = j; pivotIndex = minIndex; updatePointers();
                bars[minIndex].findOne('Rect').fill('#9C27B0');
                updateCurrentStep(`New minimum: ${array[minIndex]} at position ${minIndex}`);
            } else {
                bars[j].findOne('Rect').fill('var(--unsorted)');
            }
            layer.draw();
        }
        
        if (minIndex !== i) {
            updateCurrentStep(`Swapping ${array[i]} with minimum ${array[minIndex]}`);
            [array[i], array[minIndex]] = [array[minIndex], array[i]];
            await animateSwap(i, minIndex);
        }
        bars[i].findOne('Rect').fill('#4CAF50');
        layer.draw();
        pivotIndex = -1;
        jPointer = -1;
        updatePointers();
    }
    bars[array.length - 1].findOne('Rect').fill('#4CAF50');
    finishSort();
}

async function insertionSort() {
    bars[0].findOne('Rect').fill('#4CAF50');
    layer.draw();
    
    for (let i = 1; i < array.length; i++) {
        if (!sorting) return;
        let key = array[i], j = i - 1;
        iPointer = i; pivotIndex = i; updatePointers();
        bars[i].findOne('Rect').fill('#9C27B0');
        layer.draw();
        updateCurrentStep(`Current key: ${key} at position ${i}`);
        await new Promise(r => setTimeout(r, animationSpeed));
        
        while (j >= 0 && array[j] > key) {
            if (!sorting) return;
            jPointer = j; updatePointers();
            bars[j].findOne('Rect').fill('#FF5733');
            layer.draw();
            updateCurrentStep(`${array[j]} > ${key}, shifting right`);
            await new Promise(r => setTimeout(r, animationSpeed));
            array[j + 1] = array[j];
            bars[j].findOne('Rect').fill('var(--unsorted)');
            j--;
        }
        array[j + 1] = key;
        await redrawArray();
        for (let k = 0; k <= i; k++) bars[k].findOne('Rect').fill('#4CAF50');
        updateCurrentStep(`Inserted ${key} at position ${j+1}`);
        layer.draw();
        await new Promise(r => setTimeout(r, animationSpeed / 2));
    }
    finishSort();
}

async function redrawArray() {
    return new Promise(resolve => {
        bars.forEach(bar => bar.destroy());
        const barWidth = Math.max((width - 40) / arraySize - 2, 3);
        const spacing = Math.min(2, barWidth * 0.2);
        bars = [];
        
        array.forEach((val, i) => {
            const barHeight = Math.max((val / Math.max(...array)) * (height - 60), 5);
            const bar = new Konva.Group({ x: 20 + i * (barWidth + spacing), y: height - 40 - barHeight });
            bar.add(new Konva.Rect({ width: barWidth, height: barHeight, fill: 'var(--unsorted)', stroke: 'rgba(0, 210, 255, 0.5)', strokeWidth: 1, cornerRadius: 2 }));
            bar.add(new Konva.Text({ text: val.toString(), fontSize: Math.min(12, barWidth - 2), fontFamily: 'Arial', fill: 'white', width: barWidth, align: 'center', y: barHeight + 5 }));
            ['i', 'j', 'p'].forEach((label, idx) => {
                bar.add(new Konva.Text({ text: label, fontSize: 14, fontFamily: 'Arial', fill: ['#FFC107', '#FF5733', '#9C27B0'][idx], width: barWidth, align: 'center', y: -20, visible: false, fontStyle: 'bold' }));
            });
            layer.add(bar);
            bars.push(bar);
        });
        layer.draw();
        setTimeout(resolve, 10);
    });
}

async function mergeSort() {
    auxiliaryArray = [...array];
    await mergeSortHelper(0, array.length - 1);
    finishSort();
}

async function mergeSortHelper(start, end) {
    if (start >= end || !sorting) return;
    const mid = Math.floor((start + end) / 2);
    updateCurrentStep(`Dividing array from ${start} to ${end} (mid: ${mid})`);
    await new Promise(r => setTimeout(r, animationSpeed));
    await mergeSortHelper(start, mid);
    if (!sorting) return;
    await mergeSortHelper(mid + 1, end);
    if (!sorting) return;
    await merge(start, mid, end);
}

async function merge(start, mid, end) {
    updateCurrentStep(`Merging subarrays [${start}-${mid}] and [${mid+1}-${end}]`);
    const leftArray = array.slice(start, mid + 1);
    const rightArray = array.slice(mid + 1, end + 1);
    let i = 0, j = 0, k = start;
    
    while (i < leftArray.length && j < rightArray.length) {
        if (!sorting) return;
        iPointer = start + i; jPointer = mid + 1 + j; updatePointers();
        [iPointer, jPointer].forEach(idx => {
            if (idx >= 0 && idx < bars.length) bars[idx].findOne('Rect')?.fill(idx === iPointer ? '#FFC107' : '#FF5733');
        });
        layer.draw();
        updateCurrentStep(`Comparing ${leftArray[i]} with ${rightArray[j]}`);
        await new Promise(r => setTimeout(r, animationSpeed));
        
        const selected = leftArray[i] <= rightArray[j] ? leftArray[i++] : rightArray[j++];
        array[k] = selected;
        updateBar(k, selected);
        k++;
    }
    
    while (i < leftArray.length) { 
        if (!sorting) return; 
        updateCurrentStep(`Adding remaining ${leftArray[i]} from left`);
        array[k] = leftArray[i]; 
        updateBar(k, leftArray[i]); 
        await new Promise(r => setTimeout(r, animationSpeed));
        i++; k++; 
    }
    while (j < rightArray.length) { 
        if (!sorting) return; 
        updateCurrentStep(`Adding remaining ${rightArray[j]} from right`);
        array[k] = rightArray[j]; 
        updateBar(k, rightArray[j]); 
        await new Promise(r => setTimeout(r, animationSpeed));
        j++; k++; 
    }
    iPointer = jPointer = -1;
    updatePointers();
}

function updateBar(k, val) {
    if (k < 0 || k >= bars.length) return;
    const barHeight = (val / 100) * (height - 100);
    const bar = bars[k];
    const rect = bar.findOne('Rect');
    const valueText = bar.find('Text').find(t => !['i','j','p'].includes(t.text()));
    
    if (rect && valueText) {
        rect.height(barHeight).y(0);
        bar.y(height - 50 - barHeight);
        valueText.text(val.toString());
        rect.fill('#4CAF50');
    }
    layer.draw();
}

async function quickSort() {
    await quickSortHelper(0, array.length - 1);
    finishSort();
}

async function quickSortHelper(low, high) {
    if (low < high && sorting) {
        updateCurrentStep(`Partitioning array from ${low} to ${high}`);
        await new Promise(r => setTimeout(r, animationSpeed));
        const pi = await partition(low, high);
        if (!sorting) return;
        await quickSortHelper(low, pi - 1);
        if (!sorting) return;
        await quickSortHelper(pi + 1, high);
    }
}

async function partition(low, high) {
    const pivot = array[high];
    pivotIndex = high; updatePointers();
    bars[high].findOne('Rect').fill('#9C27B0');
    layer.draw();
    updateCurrentStep(`Pivot: ${pivot} at position ${high}`);
    await new Promise(r => setTimeout(r, animationSpeed));
    
    let i = low - 1;
    for (let j = low; j < high; j++) {
        if (!sorting) return low;
        jPointer = j; updatePointers();
        bars[j].findOne('Rect').fill('#FF5733');
        layer.draw();
        updateCurrentStep(`Comparing ${array[j]} with pivot ${pivot}`);
        await new Promise(r => setTimeout(r, animationSpeed));
        
        if (array[j] < pivot) {
            i++; iPointer = i; updatePointers();
            updateCurrentStep(`${array[j]} < ${pivot}, swapping positions ${i} and ${j}`);
            [array[i], array[j]] = [array[j], array[i]];
            await animateSwap(i, j);
        } else {
            bars[j].findOne('Rect').fill('var(--unsorted)');
            layer.draw();
        }
    }
    i++; iPointer = i; updatePointers();
    updateCurrentStep(`Placing pivot ${pivot} at correct position ${i}`);
    [array[i], array[high]] = [array[high], array[i]];
    await animateSwap(i, high);
    bars[i].findOne('Rect').fill('#4CAF50');
    layer.draw();
    pivotIndex = -1;
    return i;
}

function finishSort() {
    bars.forEach(bar => bar.findOne('Rect').fill('#4CAF50'));
    layer.draw();
    iPointer = jPointer = pivotIndex = -1;
    updatePointers();
    updateCurrentStep("Sorting complete!");
    sorting = false;
    document.getElementById('sortBtn').textContent = 'Sort!';
    document.getElementById('generateArrayBtn').disabled = false;
}

function init() {
    setupStage();
    generateArray();
    
    document.getElementById('generateArrayBtn').addEventListener('click', () => !sorting && generateArray());
    document.getElementById('arraySizeSelect').addEventListener('change', e => {
        if (!sorting) { arraySize = parseInt(e.target.value); generateArray(); }
    });
    document.getElementById('algorithmSelect').addEventListener('change', e => {
        currentAlgorithm = e.target.value;
        updateAlgorithmInfo(currentAlgorithm);
    });
    document.getElementById('speedSelect').addEventListener('change', e => animationSpeed = parseInt(e.target.value));
    
    document.getElementById('sortBtn').addEventListener('click', () => {
        if (!sorting) {
            sorting = true;
            document.getElementById('sortBtn').textContent = 'Stop';
            document.getElementById('generateArrayBtn').disabled = true;
            bars.forEach(bar => bar.findOne('Rect').fill('var(--unsorted)'));
            layer.draw();
            ({ bubble: bubbleSort, selection: selectionSort, insertion: insertionSort, merge: mergeSort, quick: quickSort }[currentAlgorithm])();
        } else {
            sorting = false;
            document.getElementById('sortBtn').textContent = 'Sort!';
            document.getElementById('generateArrayBtn').disabled = false;
            updateCurrentStep("Sorting stopped.");
        }
    });
    
    updateAlgorithmInfo(currentAlgorithm);
    window.addEventListener('resize', () => { setupStage(); visualizeArray(); });
}

window.addEventListener('load', init);