#ifdef GL_ES
precision mediump float;
#endif

// Adapted from Stockholms Ström
// https://www.shadertoy.com/view/4dd3Rl
// by Peder Norrby / Trapcode in 2016
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0

#define SPEED.0005
#define WIDTH 20.
#define DEPTH 10.
#define STEP_SIZE.3
#define PI_HALF 1.5707963267949
#define REFLECTION_FRESNEL.99
#define BACKGROUND_COLOR vec4(0.)
#define WATER_COLOR vec4(vec3(0.),1.)
#define FOG_THRESHOLD_Z -1.
#define FOG_THRESHOLD_X 8.
#define FOG_AMOUNT.025

const float X_BOUND=WIDTH*.5;
const float Z_BOUND=DEPTH*.5;

uniform vec2 uResolution;
uniform vec2 uSamplerResolution0;
uniform float uNumItems;
uniform vec2 uScroll;
uniform sampler2D uDiffuse0;
uniform int uMode;
uniform float uTime;
float time=uTime*SPEED;

mat3 rotationMatrix(vec3 axis,float angle)
{
	axis=normalize(axis);
	float s=sin(angle);
	float c=cos(angle);
	float oc=1.-c;
	return mat3(
		oc*axis.x*axis.x+c,
		oc*axis.x*axis.y-axis.z*s,
		oc*axis.z*axis.x+axis.y*s,
		oc*axis.x*axis.y+axis.z*s,
		oc*axis.y*axis.y+c,
		oc*axis.y*axis.z-axis.x*s,
		oc*axis.z*axis.x-axis.y*s,
		oc*axis.y*axis.z+axis.x*s,
		oc*axis.z*axis.z+c
	);
}

vec3 mod289(vec3 x){
	return x-floor(x*(1./289.))*289.;
}

vec4 mod289(vec4 x){
	return x-floor(x*(1./289.))*289.;
}

vec4 permute(vec4 x){
	return mod289(((x*34.)+1.)*x);
}

vec4 taylorInvSqrt(vec4 r){
	return 1.79284291400159-.85373472095314*r;
}

float noise(vec3 v){
	const vec2 C=vec2(1./6.,1./3.);
	const vec4 D=vec4(0.,.5,1.,2.);
	
	// First corner
	vec3 i=floor(v+dot(v,C.yyy));
	vec3 x0=v-i+dot(i,C.xxx);
	
	// Other corners
	vec3 g=step(x0.yzx,x0.xyz);
	vec3 l=1.-g;
	vec3 i1=min(g.xyz,l.zxy);
	vec3 i2=max(g.xyz,l.zxy);
	vec3 x1=x0-i1+C.xxx;
	vec3 x2=x0-i2+C.yyy;
	vec3 x3=x0-D.yyy;
	
	// Permutations
	i=mod289(i);
	vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
	
	// Gradients: 7x7 points over a square, mapped onto an octahedron.
	// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
	float n_=.142857142857;// 1.0/7.0
	vec3 ns=n_*D.wyz-D.xzx;
	
	vec4 j=p-49.*floor(p*ns.z*ns.z);//  mod(p,7*7)
	
	vec4 x_=floor(j*ns.z);
	vec4 y_=floor(j-7.*x_);// mod(j,N)
	
	vec4 x=x_*ns.x+ns.yyyy;
	vec4 y=y_*ns.x+ns.yyyy;
	vec4 h=1.-abs(x)-abs(y);
	
	vec4 b0=vec4(x.xy,y.xy);
	vec4 b1=vec4(x.zw,y.zw);
	
	vec4 s0=floor(b0)*2.+1.;
	vec4 s1=floor(b1)*2.+1.;
	
	vec4 sh=-step(h,vec4(0.));
	
	vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
	vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
	
	vec3 p0=vec3(a0.xy,h.x);
	vec3 p1=vec3(a0.zw,h.y);
	vec3 p2=vec3(a1.xy,h.z);
	vec3 p3=vec3(a1.zw,h.w);
	
	// Normalise gradients
	vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
	p0*=norm.x;
	p1*=norm.y;
	p2*=norm.z;
	p3*=norm.w;
	
	// Mix final noise value
	vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
	m=m*m;
	return 42.*
	dot(
		m*m,
		vec4(dot(p0,x0),
		dot(p1,x1),
		dot(p2,x2),
		dot(p3,x3)
	));
}

float fnoise(vec3 p){
	mat3 rot=rotationMatrix(normalize(vec3(0.,0.,1.)),.1*time);
	mat3 rot2=rotationMatrix(normalize(vec3(0.,0.,1.)),.3*time);
	float sum=0.;
	
	vec3 r=rot*p;
	
	float add=noise(r);
	float msc=add+.7;
	msc=clamp(msc,0.,1.);
	sum+=.6*add;
	
	p=p*1.125;
	r=rot*p;
	add=noise(r);
	
	add*=msc;
	sum+=.5*add;
	msc*=add+.7;
	msc=clamp(msc,0.,1.);
	
	p.xy=p.xy*2.;
	p=rot2*p;
	add=noise(p);
	add*=msc;
	sum+=.25*abs(add);
	return sum*.516129;
}

// x,z,time
float getHeight(vec3 p){
	return.5*fnoise(vec3(.5*(p.x+0.*time),.5*p.z,.4*time));
}

vec4 getReflectionDarkMode(vec3 rd){
	vec2 st=gl_FragCoord.xy/uSamplerResolution0;
	st+=uScroll;
	vec2 sampleCoords=mix(st,rd.xy,vec2(.025,.025*(1.-clamp(rd.z*rd.z,0.,1.))));
	float shift=.0025*rd.z;
	
	vec4 unshifted=texture2D(uDiffuse0,sampleCoords);

	vec4 bImage=texture2D(uDiffuse0,sampleCoords+vec2(shift,0.));
	bImage=mix(bImage,vec4(0.),1.-bImage.a);
	
	vec4 rImage=texture2D(uDiffuse0,sampleCoords-vec2(shift,0.));
	rImage=mix(rImage,vec4(0.),1.-rImage.a);
	
	vec4 shifted = vec4(rImage.r, unshifted.g, bImage.b, unshifted.a);
	shifted.xzy*=3.;
	return shifted;
	
	if(rd.y>.1)return shifted;
	
	if(rd.z>.9&&rd.x>.1){
		return shifted;
	}
}	
	
vec4 getReflectionLightMode(vec3 rd){
	vec2 st=gl_FragCoord.xy/uSamplerResolution0;
	st+=uScroll;
	vec2 sampleCoords=mix(st,rd.xy,vec2(.05,.1*(1.-clamp(rd.z*rd.z,0.,1.))));
	float shift=.0025*rd.z;
	
	vec4 unshifted=texture2D(uDiffuse0,sampleCoords);
	unshifted=mix(unshifted,vec4(1.),1.-unshifted.a);
	
	vec4 rImage=texture2D(uDiffuse0,sampleCoords-vec2(shift,0.));
	rImage=mix(rImage,vec4(1.),1.-rImage.a);
	
	vec4 bImage=texture2D(uDiffuse0,sampleCoords+vec2(shift,0.));
	bImage=mix(bImage,vec4(1.),1.-bImage.a);
	
	vec4 shifted=vec4(rImage.r,unshifted.g,bImage.b,unshifted.a);
	shifted.xzy*=3.;

	if(rd.y>.3)return shifted;
	if(rd.y<0.)return vec4(vec3(0.),1.);
	
	if(rd.z>.9&&rd.x>.1){
		return shifted;
	}
	return vec4(vec3(0.),1.);
}

vec4 getReflection(vec3 rd) {
	if (uMode == 0) return getReflectionLightMode(rd);
	return getReflectionDarkMode(rd);
}

vec4 shade(vec3 normal,vec3 pos,vec3 rayDirection)
{	
	float fresnel=REFLECTION_FRESNEL*
	pow(1.-clamp(dot(-rayDirection,normal),0.,1.),5.)
	+(1.-REFLECTION_FRESNEL
	);
	vec3 refVec=reflect(rayDirection,normal);
	vec4 reflection=getReflection(refVec);
	
	float deep=1.+.5*pos.y;

	vec4 col = fresnel*reflection;

	vec4 waterColor = uMode == 0 ? vec4(vec3(0.), 1.) : vec4(vec3(1.), .1);
	
	col+=vec4(vec3(deep*.4),1.)*waterColor;
	col=clamp(col,vec4(0.),vec4(1.));
	
	float zDist=0.;
	if(pos.z>FOG_THRESHOLD_Z){
		zDist=pow(abs(pos.z-FOG_THRESHOLD_Z),3.);
	}
	
	float xDist=0.;
	if(pos.x>FOG_THRESHOLD_X){
		xDist=pow(abs(pos.x-FOG_THRESHOLD_X),3.5);
	}else if(pos.x<-FOG_THRESHOLD_X){
		xDist=pow(abs(pos.x+FOG_THRESHOLD_X),3.5);
	}
	float fogZ=clamp((zDist/Z_BOUND)*FOG_AMOUNT,0.,1.);
	float fogX=clamp((xDist/(X_BOUND*.5))*FOG_AMOUNT,0.,1.);
	float fog=min(fogX+fogZ,1.);
	col=mix(col,BACKGROUND_COLOR,fog);
	return clamp(col,0.,1.);
}

vec4 trace_heightfield(vec3 rayOrigin,vec3 rayDirection)
{
	// If above horizon, return background
	float t=(1.-rayOrigin.y)/rayDirection.y;
	if(t<0.)return BACKGROUND_COLOR;
	
	// If outside of bounds, return background
	vec3 p=rayOrigin+t*rayDirection;
	if(p.x<-X_BOUND&&rayDirection.x<=0.)return BACKGROUND_COLOR;
	if(p.x>X_BOUND&&rayDirection.x>=0.)return BACKGROUND_COLOR;
	if(p.z<0.&&rayDirection.z<=0.)return BACKGROUND_COLOR;
	if(p.z>Z_BOUND&&rayDirection.z>=0.)return BACKGROUND_COLOR;
	
	float h,last_h;
	bool not_found=true;
	vec3 last_p=p;
	
	for(int i=0;i<15;i++){
		p+=STEP_SIZE*rayDirection;
		h=getHeight(p);
		
		if(p.y<h){
			not_found=false;// we stepped through
			break;
		}
		last_h=h;
		last_p=p;
	}
	
	if(not_found)return BACKGROUND_COLOR;
	
	float dh2=h-p.y;
	float dh1=last_p.y-last_h;
	p=last_p+rayDirection*STEP_SIZE/(dh2/dh1+1.);
	
	vec3 pdx=p+vec3(.01,0.,0.);
	vec3 pdz=p+vec3(0.,0.,.01);
	
	float hdx=getHeight(pdx);
	float hdz=getHeight(pdz);
	h=getHeight(p);
	
	p.y=h;
	pdx.y=hdx;
	pdz.y=hdz;
	
	vec3 normal=normalize(cross(p-pdz,p-pdx));
	
	return shade(normal,p,rayDirection);
}

mat3 setCamera(in vec3 ro,in vec3 ta,float cr){
	vec3 cw=normalize(ta-ro);
	vec3 cp=vec3(sin(cr),cos(cr),0.);
	vec3 cu=normalize(cross(cw,cp));
	vec3 cv=normalize(cross(cu,cw));
	return mat3(cu,cv,cw);
}

void main(){
	vec2 st=(-uResolution.xy+2.*gl_FragCoord.xy)/uResolution.y;
	vec3 cameraPosition=6.*normalize(vec3(0.,.5,-.8));
	vec3 cameraTarget=vec3(0.,1.5,0.);
	mat3 camera=setCamera(cameraPosition,cameraTarget,0.);
	vec3 rayDirection=camera*normalize(vec3(st.xy,4.));
	gl_FragColor=trace_heightfield(cameraPosition,rayDirection);
}