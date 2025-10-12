// Unified B-Tree with Integrated Animation
class AnimatedBTree {
    constructor(order = 3) {
        this.root = this.createNode(true, order);
        this.order = order;
        this.t = Math.ceil(order / 2);
        this.isAnimating = false;
        this.animationSpeed = 800;
        
        // Visual config
        this.cfg = {
            nodeWidth: 100, nodeHeight: 45, hSpacing: 35, vSpacing: 90,
            keyRadius: 18, nodeFill: 'rgba(45,45,55,0.95)', keyFill: 'rgba(75,75,85,0.9)',
            textColor: '#e8e8e8', lineColor: '#555',
            activeFill: 'rgba(0,150,255,0.85)', activeStroke: '#0096ff',
            processFill: 'rgba(255,200,0,0.85)', processStroke: '#ffa500',
            successFill: 'rgba(0,255,120,0.8)', successStroke: '#00ff44',
            errorFill: 'rgba(255,70,70,0.8)', errorStroke: '#ff3333'
        };
        
        this.initCanvas();
    }
    
    createNode(isLeaf = true, order = this.order) {
        return {
            id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isLeaf, keys: [], children: [], order,
            minKeys: Math.ceil(order / 2) - 1,
            maxKeys: order - 1
        };
    }
    
    initCanvas() {
        const container = document.getElementById('canvas-container');
        this.stage = new Konva.Stage({ 
            container: 'canvas-container', 
            width: container.offsetWidth, 
            height: container.offsetHeight 
        });
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        
        window.addEventListener('resize', () => {
            this.stage.width(container.offsetWidth);
            this.stage.height(container.offsetHeight);
            this.redraw();
        });
        
        this.redraw();
    }
    
    // LAYOUT CALCULATION
    calcLayout() {
        const layout = [];
        const levels = {};
        
        const traverse = (node, level = 0) => {
            if (!node) return;
            if (!levels[level]) levels[level] = [];
            levels[level].push(node);
            if (!node.isLeaf && node.children.length > 0) {
                node.children.forEach(child => traverse(child, level + 1));
            }
        };
        
        traverse(this.root);
        
        const stageWidth = this.stage.width();
        
        Object.keys(levels).forEach(lvl => {
            const nodes = levels[lvl];
            const totalWidth = nodes.reduce((sum, n) => 
                sum + Math.max(this.cfg.nodeWidth, n.keys.length * 40 + 25), 0
            ) + (nodes.length - 1) * this.cfg.hSpacing;
            
            let x = (stageWidth - totalWidth) / 2;
            const y = 70 + parseInt(lvl) * this.cfg.vSpacing;
            
            nodes.forEach(node => {
                const w = Math.max(this.cfg.nodeWidth, node.keys.length * 40 + 25);
                layout.push({ node, x: x + w / 2, y, width: w, height: this.cfg.nodeHeight });
                x += w + this.cfg.hSpacing;
            });
        });
        
        return layout;
    }
    
    findNodeLayout(node, layout) {
        return layout.find(item => item.node.id === node.id);
    }
    
    // DRAWING
    redraw() {
        this.layer.destroyChildren();
        const layout = this.calcLayout();
        
        // Draw connections first
        layout.forEach(nl => {
            if (!nl.node.isLeaf && nl.node.children.length > 0) {
                nl.node.children.forEach(child => {
                    const childLayout = this.findNodeLayout(child, layout);
                    if (childLayout) {
                        const line = new Konva.Line({
                            points: [nl.x, nl.y + this.cfg.nodeHeight/2, 
                                    childLayout.x, childLayout.y - this.cfg.nodeHeight/2],
                            stroke: this.cfg.lineColor,
                            strokeWidth: 2.5,
                            opacity: 0.7,
                            lineCap: 'round'
                        });
                        this.layer.add(line);
                    }
                });
            }
        });
        
        // Draw nodes
        layout.forEach(nl => this.drawNode(nl.node, nl.x, nl.y));
        this.layer.batchDraw();
    }
    
    drawNode(node, x, y) {
        const w = Math.max(this.cfg.nodeWidth, node.keys.length * 40 + 25);
        const group = new Konva.Group({ 
            x: x - w/2, 
            y: y - this.cfg.nodeHeight/2,
            id: `group_${node.id}`
        });
        
        // Node background
        const rect = new Konva.Rect({
            x: 0, y: 0, width: w, height: this.cfg.nodeHeight,
            fill: this.cfg.nodeFill, stroke: this.cfg.lineColor,
            strokeWidth: 2, cornerRadius: 8,
            shadowColor: 'black', shadowBlur: 10,
            shadowOffset: { x: 3, y: 3 }, shadowOpacity: 0.5,
            id: `rect_${node.id}`
        });
        group.add(rect);
        
        // Draw keys
        const spacing = w / (node.keys.length + 1);
        node.keys.forEach((key, i) => {
            const kx = spacing * (i + 1);
            
            const circle = new Konva.Circle({
                x: kx, y: this.cfg.nodeHeight/2,
                radius: this.cfg.keyRadius,
                fill: this.cfg.keyFill,
                stroke: this.cfg.lineColor,
                strokeWidth: 2,
                id: `key_${node.id}_${i}`
            });
            
            const text = new Konva.Text({
                x: kx - 20, y: this.cfg.nodeHeight/2 - 9,
                text: key.toString(),
                fontSize: 16, fontFamily: 'Consolas, Monaco, monospace',
                fill: this.cfg.textColor, fontStyle: 'bold',
                width: 40, align: 'center'
            });
            
            group.add(circle);
            group.add(text);
        });
        
        this.layer.add(group);
    }
    
    // ANIMATION HELPERS
    async showMessage(msg, color = '#0096ff') {
        const info = document.getElementById('operation-details');
        if (info) {
            info.innerHTML = `<strong style="color: ${color}">${msg}</strong>`;
        }
    }
    
    async highlightNode(node, fill, stroke, labelText = null) {
        const group = this.stage.findOne(`#group_${node.id}`);
        const rect = this.stage.findOne(`#rect_${node.id}`);
        
        if (rect) {
            rect.to({ fill, stroke, strokeWidth: 4, duration: 0.3 });
            
            // Show value label floating above node
            if (labelText) {
                const label = new Konva.Label({
                    x: group.x() + group.width()/2 - 40,
                    y: group.y() - 35,
                    opacity: 0,
                    id: `label_${node.id}`
                });
                
                label.add(new Konva.Tag({
                    fill: fill,
                    cornerRadius: 6,
                    shadowColor: 'black',
                    shadowBlur: 5,
                    shadowOpacity: 0.6
                }));
                
                label.add(new Konva.Text({
                    text: labelText,
                    fontSize: 15,
                    fontFamily: 'Consolas',
                    fontStyle: 'bold',
                    fill: 'white',
                    padding: 8
                }));
                
                this.layer.add(label);
                label.to({ opacity: 1, duration: 0.3 });
            }
        }
        
        this.layer.batchDraw();
        await this.delay(this.animationSpeed);
    }
    
    async highlightKey(node, keyIndex, fill, stroke) {
        const circle = this.stage.findOne(`#key_${node.id}_${keyIndex}`);
        if (circle) {
            await new Promise(resolve => {
                circle.to({ 
                    fill, stroke, strokeWidth: 3,
                    scaleX: 1.2, scaleY: 1.2,
                    duration: 0.3,
                    onFinish: resolve
                });
            });
            this.layer.batchDraw();
        }
        await this.delay(this.animationSpeed * 0.6);
    }
    
    clearLabels() {
        this.stage.find('Label').forEach(label => label.destroy());
    }
    
    async animateTraversal(fromNode, toNode, value) {
        await this.highlightNode(fromNode, this.cfg.activeFill, this.cfg.activeStroke, `Looking for ${value}`);
        this.clearLabels();
        await this.highlightNode(toNode, this.cfg.processFill, this.cfg.processStroke, `→ Checking ${value}`);
        this.clearLabels();
    }
    
    async animateInsertion(node, key, position) {
        const group = this.stage.findOne(`#group_${node.id}`);
        if (!group) return;
        
        const w = Math.max(this.cfg.nodeWidth, node.keys.length * 40 + 25);
        const spacing = w / (node.keys.length + 1);
        const targetX = group.x() + spacing * (position + 1);
        const targetY = group.y() + this.cfg.nodeHeight/2;
        
        // Animated arrow pointing down
        const arrow = new Konva.Arrow({
            x: targetX, y: targetY - 50,
            points: [0, 0, 0, 35],
            pointerLength: 10, pointerWidth: 10,
            fill: this.cfg.successStroke,
            stroke: this.cfg.successStroke,
            strokeWidth: 3,
            opacity: 0
        });
        this.layer.add(arrow);
        arrow.to({ opacity: 1, y: targetY - 45, duration: 0.4 });
        await this.delay(400);
        
        // Animate new key appearing
        const newCircle = new Konva.Circle({
            x: targetX, y: targetY,
            radius: 0,
            fill: this.cfg.successFill,
            stroke: this.cfg.successStroke,
            strokeWidth: 3
        });
        
        const newText = new Konva.Text({
            x: targetX - 20, y: targetY - 9,
            text: key.toString(),
            fontSize: 16, fontFamily: 'Consolas',
            fill: this.cfg.textColor, fontStyle: 'bold',
            width: 40, align: 'center',
            opacity: 0
        });
        
        this.layer.add(newCircle);
        this.layer.add(newText);
        
        await Promise.all([
            new Promise(resolve => newCircle.to({ radius: this.cfg.keyRadius, duration: 0.5, onFinish: resolve })),
            new Promise(resolve => newText.to({ opacity: 1, duration: 0.5, onFinish: resolve }))
        ]);
        
        await this.delay(400);
        arrow.destroy();
        newCircle.destroy();
        newText.destroy();
        
        this.redraw();
    }
    
    async animateSplit(parent, leftChild, rightChild, midKey) {
        await this.showMessage(`Node full! Splitting at key ${midKey}`, '#ff6600');
        
        // Highlight overfull node
        await this.highlightNode(leftChild, this.cfg.errorFill, this.cfg.errorStroke, 'FULL - Splitting');
        
        // Pulse animation
        const group = this.stage.findOne(`#group_${leftChild.id}`);
        if (group) {
            await new Promise(resolve => {
                group.to({ scaleX: 1.15, scaleY: 1.15, duration: 0.3, onFinish: () => {
                    group.to({ scaleX: 1, scaleY: 1, duration: 0.3, onFinish: resolve });
                }});
            });
        }
        
        this.clearLabels();
        await this.delay(300);
        
        // Redraw with new structure
        this.redraw();
        
        // Highlight results
        await this.showMessage(`Split complete: [${leftChild.keys.join(',')}] | ${midKey} | [${rightChild.keys.join(',')}]`, '#00ff44');
        await this.highlightNode(leftChild, this.cfg.successFill, this.cfg.successStroke, 'Left');
        await this.highlightNode(rightChild, this.cfg.successFill, this.cfg.successStroke, 'Right');
        await this.highlightNode(parent, this.cfg.activeFill, this.cfg.activeStroke, `↑ ${midKey}`);
        
        this.clearLabels();
    }
    
    async animateMerge(parent, leftChild, rightChild) {
        await this.showMessage('Merging nodes...', '#ff6600');
        await this.highlightNode(leftChild, this.cfg.errorFill, this.cfg.errorStroke, 'Merging...');
        await this.highlightNode(rightChild, this.cfg.errorFill, this.cfg.errorStroke, 'Merging...');
        
        this.clearLabels();
        await this.delay(500);
        
        this.redraw();
        await this.highlightNode(leftChild, this.cfg.successFill, this.cfg.successStroke, `Merged: [${leftChild.keys.join(',')}]`);
        this.clearLabels();
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // INSERT OPERATION
    async insert(key) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        await this.showMessage(`🔵 Inserting ${key}`, '#0096ff');
        this.clearLabels();
        
        try {
            if (this.root.keys.length === 0) {
                this.root.keys.push(key);
                await this.animateInsertion(this.root, key, 0);
                await this.showMessage(`✓ Inserted ${key}`, '#00ff44');
            } else {
                await this._insertNonFull(this.root, key, null);
                
                if (this.root.keys.length > this.root.maxKeys) {
                    const oldRoot = this.root;
                    this.root = this.createNode(false, this.order);
                    this.root.children.push(oldRoot);
                    await this._splitChild(this.root, 0);
                }
                
                await this.showMessage(`✓ Successfully inserted ${key}`, '#00ff44');
            }
        } finally {
            this.clearLabels();
            this.redraw();
            await this.delay(500);
            this.isAnimating = false;
        }
    }
    
    async _insertNonFull(node, key, parent) {
        await this.highlightNode(node, this.cfg.activeFill, this.cfg.activeStroke, `[${node.keys.join(',')}]`);
        
        if (node.isLeaf) {
            let i = node.keys.length - 1;
            while (i >= 0 && key < node.keys[i]) i--;
            const pos = i + 1;
            
            node.keys.splice(pos, 0, key);
            this.clearLabels();
            await this.animateInsertion(node, key, pos);
            return;
        }
        
        // Find child to traverse to
        let i = node.keys.length - 1;
        while (i >= 0 && key < node.keys[i]) i--;
        i++;
        
        if (i >= node.children.length) {
            node.children[i] = this.createNode(true, node.order);
        }
        
        this.clearLabels();
        await this.animateTraversal(node, node.children[i], key);
        
        await this._insertNonFull(node.children[i], key, node);
        
        if (node.children[i].keys.length > node.children[i].maxKeys) {
            await this._splitChild(node, i);
        }
    }
    
    async _splitChild(parent, idx) {
        const child = parent.children[idx];
        const newNode = this.createNode(child.isLeaf, child.order);
        const mid = Math.floor(child.keys.length / 2);
        const midKey = child.keys[mid];
        
        newNode.keys = child.keys.slice(mid + 1);
        child.keys = child.keys.slice(0, mid);
        
        if (!child.isLeaf) {
            newNode.children = child.children.slice(mid + 1);
            child.children = child.children.slice(0, mid + 1);
        }
        
        parent.keys.splice(idx, 0, midKey);
        parent.children.splice(idx + 1, 0, newNode);
        
        await this.animateSplit(parent, child, newNode, midKey);
    }
    
    // DELETE OPERATION
    async delete(key) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        await this.showMessage(`🔴 Deleting ${key}`, '#ff3333');
        this.clearLabels();
        
        try {
            await this._delete(this.root, key);
            
            if (this.root.keys.length === 0 && !this.root.isLeaf && this.root.children.length > 0) {
                this.root = this.root.children[0];
                this.redraw();
            }
            
            await this.showMessage(`✓ Deleted ${key}`, '#00ff44');
        } catch(e) {
            await this.showMessage(`✗ ${key} not found`, '#ff3333');
        } finally {
            this.clearLabels();
            this.redraw();
            await this.delay(500);
            this.isAnimating = false;
        }
    }
    
    async _delete(node, key) {
        let idx = 0;
        while (idx < node.keys.length && node.keys[idx] < key) idx++;
        
        await this.highlightNode(node, this.cfg.activeFill, this.cfg.activeStroke, `Checking [${node.keys.join(',')}]`);
        this.clearLabels();
        
        if (idx < node.keys.length && node.keys[idx] === key) {
            await this.highlightKey(node, idx, this.cfg.errorFill, this.cfg.errorStroke);
            
            if (node.isLeaf) {
                node.keys.splice(idx, 1);
                this.redraw();
                return;
            }
            
            // Internal node deletion (simplified for animation)
            if (node.children[idx].keys.length >= this.t) {
                const pred = this._getPredecessor(node, idx);
                node.keys[idx] = pred;
                await this._delete(node.children[idx], pred);
            } else if (node.children[idx + 1].keys.length >= this.t) {
                const succ = this._getSuccessor(node, idx);
                node.keys[idx] = succ;
                await this._delete(node.children[idx + 1], succ);
            } else {
                await this._merge(node, idx);
                await this._delete(node.children[idx], key);
            }
        } else {
            if (node.isLeaf) {
                throw new Error('Key not found');
            }
            
            if (node.children[idx].keys.length < this.t) {
                await this._fill(node, idx);
            }
            
            const isLast = (idx === node.keys.length);
            if (isLast && idx > node.keys.length) {
                await this._delete(node.children[idx - 1], key);
            } else {
                await this._delete(node.children[idx], key);
            }
        }
    }
    
    _getPredecessor(node, idx) {
        let curr = node.children[idx];
        while (!curr.isLeaf) curr = curr.children[curr.children.length - 1];
        return curr.keys[curr.keys.length - 1];
    }
    
    _getSuccessor(node, idx) {
        let curr = node.children[idx + 1];
        while (!curr.isLeaf) curr = curr.children[0];
        return curr.keys[0];
    }
    
    async _merge(node, idx) {
        const child = node.children[idx];
        const sibling = node.children[idx + 1];
        
        await this.animateMerge(node, child, sibling);
        
        child.keys.push(node.keys[idx]);
        child.keys.push(...sibling.keys);
        if (!child.isLeaf) child.children.push(...sibling.children);
        
        node.keys.splice(idx, 1);
        node.children.splice(idx + 1, 1);
    }
    
    async _fill(node, idx) {
        if (idx !== 0 && node.children[idx - 1].keys.length >= this.t) {
            await this._borrowFromPrev(node, idx);
        } else if (idx !== node.keys.length && node.children[idx + 1].keys.length >= this.t) {
            await this._borrowFromNext(node, idx);
        } else {
            if (idx !== node.keys.length) await this._merge(node, idx);
            else await this._merge(node, idx - 1);
        }
    }
    
    async _borrowFromPrev(node, idx) {
        const child = node.children[idx];
        const sibling = node.children[idx - 1];
        
        child.keys.unshift(node.keys[idx - 1]);
        node.keys[idx - 1] = sibling.keys.pop();
        if (!child.isLeaf) child.children.unshift(sibling.children.pop());
        
        this.redraw();
        await this.delay(this.animationSpeed);
    }
    
    async _borrowFromNext(node, idx) {
        const child = node.children[idx];
        const sibling = node.children[idx + 1];
        
        child.keys.push(node.keys[idx]);
        node.keys[idx] = sibling.keys.shift();
        if (!child.isLeaf) child.children.push(sibling.children.shift());
        
        this.redraw();
        await this.delay(this.animationSpeed);
    }
    
    // SEARCH OPERATION
    async search(key) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        await this.showMessage(`🔍 Searching for ${key}`, '#0096ff');
        this.clearLabels();
        
        try {
            const found = await this._search(this.root, key);
            if (found) {
                await this.showMessage(`✓ Found ${key}!`, '#00ff44');
            } else {
                await this.showMessage(`✗ ${key} not found`, '#ff3333');
            }
        } finally {
            this.clearLabels();
            await this.delay(800);
            this.redraw();
            this.isAnimating = false;
        }
    }
    
    async _search(node, key) {
        await this.highlightNode(node, this.cfg.activeFill, this.cfg.activeStroke, `Searching [${node.keys.join(',')}]`);
        
        let i = 0;
        while (i < node.keys.length && key > node.keys[i]) i++;
        
        if (i < node.keys.length && key === node.keys[i]) {
            this.clearLabels();
            await this.highlightKey(node, i, this.cfg.successFill, this.cfg.successStroke);
            return true;
        }
        
        if (node.isLeaf) {
            this.clearLabels();
            return false;
        }
        
        this.clearLabels();
        return await this._search(node.children[i], key);
    }
    
    // BULK INSERT WITH PROGRESSIVE ANIMATION
    async bulkInsert(values) {
        for (const val of values) {
            await this.insert(val);
            await this.delay(200); // Small pause between insertions
        }
    }
}

// UI Controller
document.addEventListener('DOMContentLoaded', () => {
    let tree = new AnimatedBTree(3);
    
    const getInt = (id) => parseInt(document.getElementById(id)?.value || 0);
    const getVal = () => getInt('value-input');
    
    document.getElementById('create-btn')?.addEventListener('click', () => {
        const order = getInt('order-input');
        if (order < 3) return alert('Order must be ≥ 3');
        tree = new AnimatedBTree(order);
        
        // Add sample data progressively
        const samples = [10, 20, 30, 40, 50];
        tree.bulkInsert(samples);
    });
    
    document.getElementById('insert-btn')?.addEventListener('click', async () => {
        const val = getVal();
        if (isNaN(val)) return alert('Enter valid number');
        await tree.insert(val);
        document.getElementById('value-input').value = '';
    });
    
    document.getElementById('search-btn')?.addEventListener('click', async () => {
        const val = getVal();
        if (isNaN(val)) return alert('Enter valid number');
        await tree.search(val);
    });
    
    document.getElementById('delete-btn')?.addEventListener('click', async () => {
        const val = getVal();
        if (isNaN(val)) return alert('Enter valid number');
        await tree.delete(val);
        document.getElementById('value-input').value = '';
    });
    
    document.getElementById('auto-insert-btn')?.addEventListener('click', async () => {
        const values = Array.from({length: 10}, () => Math.floor(Math.random() * 100));
        await tree.bulkInsert(values);
    });
    
    document.getElementById('clear-btn')?.addEventListener('click', () => {
        tree = new AnimatedBTree(tree.order);
        document.getElementById('operation-details').textContent = 'Tree cleared';
    });
    
    document.getElementById('animation-speed')?.addEventListener('change', (e) => {
        const speeds = { fast: 400, medium: 800, slow: 1500 };
        tree.animationSpeed = speeds[e.target.value] || 800;
    });
    
    document.getElementById('value-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('insert-btn')?.click();
    });
});
