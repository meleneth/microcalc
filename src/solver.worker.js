import { solveGoldenPathProgress } from "./goldenPath.js";
self.onmessage=({data})=>{
  if(data.type!=="run")return;
  let search;
  try{search=solveGoldenPathProgress(data.options??{});}
  catch(error){self.postMessage({type:"error",message:String(error)});return;}
  // Yield to the worker's message loop between bounded batches.
  function batch(){
    try{
      for(let i=0;i<4;i++){
        const next=search.next();
        if(next.done){self.postMessage({type:"done",result:next.value});return;}
        self.postMessage(next.value);
      }
      setTimeout(batch,0);
    }catch(error){self.postMessage({type:"error",message:error?.stack??String(error)});}
  }
  batch();
};
