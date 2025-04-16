const container = document.getElementById('container');
const width = container.clientWidth;
const height = container.clientHeight;
let stage = new Konva.Stage({
    container: "container",
    width: width,
    height: height,
  });
  let layer = new Konva.Layer();
  stage.add(layer);

  export { stage, layer };


  