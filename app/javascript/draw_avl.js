 import{stage ,layer} from "konva_setup";

 const vertcalSpacing = 100;

 export function redrawTree(node) {
    if (!node) return;
    if (node.parent) {
      const isLeft = (node === node.parent.left);
      const lineColor = isLeft ? '#FF4081' : '#18FFFF';
      const dx = node.x - node.parent.x;
      const dy = node.y - node.parent.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Define the radius of the circles (assuming both have the same radius)
      const radius = 25;

      // Compute the starting point on the parent's boundary
      const startX = node.parent.x + (dx / distance) * radius;
      const startY = node.parent.y + (dy / distance) * radius;

      // Compute the ending point on the current node's boundary
      const endX = node.x - (dx / distance) * radius;
      const endY = node.y - (dy / distance) * radius;



      const line = new Konva.Line({
        points: [startX, startY, endX, endY],
         stroke: lineColor,
        strokeWidth: 2,
        lineCap: 'round',
        lineJoin: 'round',
        shadowColor: lineColor,
        shadowBlur: 5,
        opacity: 0.8
      });
      layer.add(line);
    }
    const hue = (node.depth * 60) % 360;
    const circle = new Konva.Circle({
      x: node.x,
      y: node.y,
      radius: 25,
      fill: `hsl(${hue}, 80%, 50%)`,
      shadowColor: 'black',
      shadowBlur: 10,
      shadowOpacity: 0.5
    });
    layer.add(circle);
    const text = new Konva.Text({
      x: node.x - 10,
      y: node.y - 10,
      text: node.value.toString(),
      fontSize: 18,
      fill: 'white',
      fontFamily: 'Arial',
      fontWeight: 'bold'
    });
    layer.add(text);
    node.circle = circle;
    node.text = text;
    redrawTree(node.left);
    redrawTree(node.right);
    layer.draw();
  }

  export function updateTreePositions(node) {
    if (!node) return;
    if (node.circle) {
      node.circle.to({
        x: node.x,
        y: node.y,
        duration: 0.6,
        easing: Konva.Easings.ElasticEaseOut
      });
    }
    if (node.text) {
      node.text.to({
        x: node.x - 10,
        y: node.y - 10,
        duration: 0.6,
        easing: Konva.Easings.ElasticEaseOut
      });
    }
    updateTreePositions(node.left);
    updateTreePositions(node.right);
  }