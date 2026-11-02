export const TICKET_COLORS={red:'#ed3545',orange:'#ff8628',yellow:'#ffc629',green:'#16a15e',blue:'#1761ef',purple:'#854ce6'};
export function squareLayout(width,height,columns,rows,gap=4,header=0){
  const size=Math.max(0,Math.floor(Math.min((width-gap*(columns-1))/columns,(height-header-gap*(rows-1))/rows)));
  return{size,width:size*columns+gap*(columns-1),height:size*rows+gap*(rows-1)};
}
export function fitTicket(body,grid,mode,heading){
  if(!body||!grid||!body.clientWidth||!body.clientHeight)return;
  const gap=parseFloat(getComputedStyle(grid).columnGap)||4,head=mode===75?(heading?.offsetHeight||28):0;
  const layout=squareLayout(body.clientWidth-4,body.clientHeight-4,mode===75?5:9,mode===75?5:3,gap,head);
  if(layout.size<=0)return;
  Object.assign(grid.style,{width:layout.width+'px',height:layout.height+'px',flex:'none',gridTemplateColumns:`repeat(${mode===75?5:9},${layout.size}px)`,gridTemplateRows:`repeat(${mode===75?5:3},${layout.size}px)`});
  grid.style.setProperty('--cell-font',Math.max(11,Math.floor(layout.size*.46))+'px');
  if(heading)heading.style.width=layout.width+'px';
}
