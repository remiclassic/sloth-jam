import{Jt as e,K as t,L as n,Pt as r,R as i,Xt as a,ct as o,dt as s,et as c,x as l,yt as u}from"./palette-CITGC5X6.js";var d=`
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`,f=`
#include <packing>
uniform sampler2D tDepth;
uniform sampler2D tFocus;
uniform vec2 uClip;
uniform float uDof;
float toyDistance( vec2 uv ) {
	return - perspectiveDepthToViewZ( texture2D( tDepth, uv ).x, uClip.x, uClip.y );
}
float toyBlur( float d ) {
	float f = texture2D( tFocus, vec2( 0.5 ) ).r;
	float behind = smoothstep( 0.6, 3.0, ( d - f ) / f ) * 0.85;
	float before = smoothstep( 0.3, 0.75, ( f - d ) / f );
	return max( behind, before ) * uDof;
}
`,p=`
${f}
uniform float uEase;
void main() {
	float d = 1.0e6;
	for ( int x = -1; x <= 1; x ++ ) {
		for ( int y = -1; y <= 1; y ++ ) {
			d = min( d, toyDistance( vec2( 0.5, 0.42 ) + vec2( float( x ), float( y ) ) * vec2( 0.035, 0.06 ) ) );
		}
	}
	gl_FragColor = vec4( d, 0.0, 0.0, uEase );
}
`,m=`
${f}
uniform sampler2D tScene;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
	vec4 sum = vec4( 0.0 );
	for ( int i = 0; i < 4; i ++ ) {
		vec2 uv = vUv + uTexel * vec2( i < 2 ? -0.5 : 0.5, mod( float( i ), 2.0 ) < 0.5 ? -0.5 : 0.5 );
		float blur = toyBlur( toyDistance( uv ) );
		sum += vec4( min( texture2D( tScene, uv ).rgb, vec3( 4.0 ) ) * blur, blur );
	}
	gl_FragColor = sum * 0.25;
}
`,h=`
uniform sampler2D tScene;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
void main() {
	vec3 sum = vec3( 0.0 );
	for ( int i = 0; i < 4; i ++ ) {
		vec2 uv = vUv + uTexel * vec2( i < 2 ? -1.0 : 1.0, mod( float( i ), 2.0 ) < 0.5 ? -1.0 : 1.0 );
		vec3 c = min( texture2D( tScene, uv ).rgb, vec3( 6.0 ) );
		float peak = max( c.r, max( c.g, c.b ) );
		sum += c * smoothstep( uThreshold, uThreshold + 0.6, peak );
	}
	gl_FragColor = vec4( sum * 0.25, 1.0 );
}
`,g=`
uniform sampler2D tMap;
uniform vec2 uStep;
varying vec2 vUv;
void main() {
	vec4 sum = texture2D( tMap, vUv ) * 0.227027;
	sum += ( texture2D( tMap, vUv + uStep * 1.384615 ) + texture2D( tMap, vUv - uStep * 1.384615 ) ) * 0.316216;
	sum += ( texture2D( tMap, vUv + uStep * 3.230769 ) + texture2D( tMap, vUv - uStep * 3.230769 ) ) * 0.070270;
	gl_FragColor = sum;
}
`,_=`
${f}
uniform sampler2D tScene;
uniform sampler2D tSoft;
uniform sampler2D tGlow;
uniform float uBloom;
varying vec2 vUv;
void main() {
	vec3 color = texture2D( tScene, vUv ).rgb;
	vec4 soft = texture2D( tSoft, vUv );
	if ( soft.a > 0.002 ) color = mix( color, soft.rgb / soft.a, toyBlur( toyDistance( vUv ) ) );
	color += texture2D( tGlow, vUv ).rgb * uBloom;
	gl_FragColor = vec4( color, 1.0 );
	// The scene's depth goes out with its colour, for the sharp things drawn after.
	gl_FragDepth = texture2D( tDepth, vUv ).x;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
`,v=30,y=new Set;function b(e){return e.layers.enable(v),y.add(e),e.addEventListener(`added`,()=>y.add(e)),e.addEventListener(`removed`,()=>y.delete(e)),e}function x(e){let t=e;for(;t.parent;)t=t.parent;return t}function S(f){if(!f.capabilities.isWebGL2&&!f.extensions.has(`EXT_color_buffer_half_float`)||!f.extensions.has(`EXT_color_buffer_float`)&&!f.extensions.has(`EXT_color_buffer_half_float`))return null;let b=(e=0)=>new a(1,1,{type:c,samples:e,depthBuffer:e>0,minFilter:o,magFilter:o}),S=b(4);S.depthTexture=new t(1,1);let C=b(),w=b(),T=b(),E=b(),D=b(),O={tDepth:{value:S.depthTexture},tFocus:{value:D.texture},uClip:{value:new e(.1,100)},uDof:{value:0}},k=(e,t,n={})=>new r({vertexShader:d,fragmentShader:e,uniforms:t,depthTest:!1,depthWrite:!1,toneMapped:!1,...n}),A=k(p,{...O,uEase:{value:1}},{transparent:!0}),j=k(m,{...O,tScene:{value:S.texture},uTexel:{value:new e}}),M=k(h,{tScene:{value:S.texture},uTexel:{value:new e},uThreshold:{value:1}}),N=k(g,{tMap:{value:null},uStep:{value:new e}}),P=k(_,{...O,tScene:{value:S.texture},tSoft:{value:C.texture},tGlow:{value:T.texture},uBloom:{value:0}},{toneMapped:!0,depthTest:!0,depthWrite:!0,depthFunc:1}),F=new i;F.setAttribute(`position`,new n(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3)),F.setAttribute(`uv`,new n(new Float32Array([0,0,2,0,0,2]),2));let I=new s(F,P);I.frustumCulled=!1;let L=new u(-1,1,1,-1,0,1),R=(e,t)=>{I.material=e,f.setRenderTarget(t),f.render(I,L)},z=(e,t,n)=>{N.uniforms.tMap.value=e.texture,N.uniforms.uStep.value.set(n/e.width,0),R(N,t),N.uniforms.tMap.value=t.texture,N.uniforms.uStep.value.set(0,n/e.height),R(N,e)},B=new e,V=0,H=0,U=!1,W=[];return{target:S,render(e,t){if(f.getDrawingBufferSize(B),S.samples!==l.samples&&(S.dispose(),S.samples=l.samples),B.x!==V||B.y!==H){V=B.x,H=B.y,S.setSize(V,H);let e=Math.max(1,V>>1),t=Math.max(1,H>>1);C.setSize(e,t),w.setSize(e,t),T.setSize(Math.max(1,V>>2),Math.max(1,H>>2)),E.setSize(Math.max(1,V>>2),Math.max(1,H>>2)),j.uniforms.uTexel.value.set(1/V,1/H),M.uniforms.uTexel.value.set(1/V,1/H),U=!1}W.length=0;for(let t of y)t.visible&&x(t)===e&&(W.push(t),t.visible=!1);f.setRenderTarget(S),f.render(e,t);for(let e of W)e.visible=!0;let n=t,r=n.isPerspectiveCamera?l.dof*(e.userData.dof??1):0;if(O.uDof.value=r,O.uClip.value.set(n.near??.1,n.far??100),r>0){A.uniforms.uEase.value=U?.08:1,U=!0;let e=f.autoClear;f.autoClear=!1,R(A,D),f.autoClear=e,R(j,C),z(C,w,1.6)}else U=!1;let i=l.bloom*(e.userData.bloom??1);if(P.uniforms.uBloom.value=i,i>0&&(M.uniforms.uThreshold.value=l.bloomThreshold,R(M,T),z(T,E,1.2),z(T,E,2.4)),R(P,null),W.length>0){let n=t.layers.mask,r=e.background,i=f.shadowMap.autoUpdate,a=f.autoClear;t.layers.set(v),e.background=null,f.shadowMap.autoUpdate=!1,f.autoClear=!1,f.render(e,t),t.layers.mask=n,e.background=r,f.shadowMap.autoUpdate=i,f.autoClear=a}},dispose(){for(let e of[S,C,w,T,E,D])e.dispose();S.depthTexture?.dispose();for(let e of[A,j,M,N,P])e.dispose();F.dispose()}}}export{b as n,S as t};