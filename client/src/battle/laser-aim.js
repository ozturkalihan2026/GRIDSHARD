(function (root) {
  "use strict";
  // Presentation geometry only. Four stationary plane points preserve exact
  // muzzle placement even when the optional battlefield camera is tilted.
  const PIVOT = Object.freeze({x:.5,y:.5});
  const MUZZLE = Object.freeze({x:.9,y:.5});
  function project(m, p) {
    if (!m || !p) return null;
    const w=m[6]*p.x+m[7]*p.y+m[8];
    if (!Number.isFinite(w) || Math.abs(w)<1e-9) return null;
    return {x:(m[0]*p.x+m[1]*p.y+m[2])/w,y:(m[3]*p.x+m[4]*p.y+m[5])/w};
  }
  function inverse(m) {
    const [a,b,c,d,e,f,g,h,i]=m;
    const det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
    if (!Number.isFinite(det) || Math.abs(det)<1e-9) return null;
    return [e*i-f*h,c*h-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*h-e*g,b*g-a*h,a*e-b*d].map(n=>n/det);
  }
  function plane(points, rect) {
    if (!points || points.length!==4 || points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))) {
      if (!rect || !(rect.width>0 && rect.height>0)) return null;
      return [rect.width,0,rect.left,0,rect.height,rect.top,0,0,1];
    }
    const [p0,p1,p2,p3]=points;
    const dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x;
    const dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y;
    let g=0,h=0;
    if (Math.abs(dx3)+Math.abs(dy3)>1e-7) {
      const den=dx1*dy2-dx2*dy1;
      if (Math.abs(den)<1e-9) return plane(null,rect);
      g=(dx3*dy2-dx2*dy3)/den; h=(dx1*dy3-dx3*dy1)/den;
    }
    const result=[p1.x-p0.x+g*p1.x,p3.x-p0.x+h*p3.x,p0.x,
      p1.y-p0.y+g*p1.y,p3.y-p0.y+h*p3.y,p0.y,g,h,1];
    return inverse(result) ? result : plane(null,rect);
  }
  const nearestAngle=(from,to)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from));
  function muzzleAt(matrix, angle) {
    const dx=MUZZLE.x-PIVOT.x,dy=MUZZLE.y-PIVOT.y;
    return project(matrix,{x:PIVOT.x+dx*Math.cos(angle)-dy*Math.sin(angle),y:PIVOT.y+dx*Math.sin(angle)+dy*Math.cos(angle)});
  }
  function aim(matrix, target, previous=0) {
    const inv=matrix && inverse(matrix), local=inv && project(inv,target);
    if (!local) return null;
    const dx=local.x-PIVOT.x,dy=local.y-PIVOT.y;
    if (Math.hypot(dx,dy)<1e-8) return null;
    const angle=nearestAngle(previous,Math.atan2(dy,dx));
    return {angle,pivot:project(matrix,PIVOT),muzzle:muzzleAt(matrix,angle),target};
  }
  const api={PIVOT,MUZZLE,project,inverse,plane,nearestAngle,muzzleAt,aim};
  root.GridshardLaserAim=Object.freeze(api);
  if (typeof module!=="undefined" && module.exports) module.exports=api;
})(typeof window!=="undefined" ? window : globalThis);
