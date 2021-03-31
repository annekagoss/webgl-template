import * as React from 'react';
import { UniformSettings, Vector2, MESH_TYPE, LoadedShaders, UNIFORM_TYPE } from '../../../types';
import { assignUniforms, InitializeProps } from '../../../lib/gl/initialize';
import { useAnimationFrame } from '../../hooks/animation';
import { useWindowSize } from '../../hooks/resize';
import {useInitializeGL} from '../../hooks/gl';
import { BASE_UNIFORMS } from '../../utils/general';
import vertexShader from '../../../lib/gl/shaders/base.vert';
import fragmentShader from '../../../lib/gl/shaders/base.frag';

import styles from './Canvas.module.scss';

const UNIFORMS: UniformSettings = {
	...BASE_UNIFORMS,
	uTime: {
		defaultValue: 0,
		name: 'uTime',
		readonly: true,
		type: UNIFORM_TYPE.FLOAT_1,
		value: 0,
	},
	uMouse: {
		defaultValue: { x: 0.5, y: 0.5 },
		name: 'uMouse',
		readonly: true,
		type: UNIFORM_TYPE.VEC_2,
		value: { x: 0.5, y: 0.5 }
	}
};

interface Props {
	fragmentShader: string;
	vertexShader: string;
	uniforms: UniformSettings;
}

interface RenderProps {
	gl: WebGLRenderingContext;
	uniformLocations: Record<string, WebGLUniformLocation>;
	uniforms: UniformSettings;
	time: number;
	mousePos: Vector2;
}

const render = ({ gl, uniformLocations, uniforms, time, mousePos }: RenderProps) => {
	if (!gl) return;
	assignUniforms(uniforms, uniformLocations, gl, time, mousePos);
	gl.activeTexture(gl.TEXTURE0);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

const Canvas = () => {
	const canvasRef: React.RefObject<HTMLCanvasElement> = React.useRef<HTMLCanvasElement>();
	const size: React.MutableRefObject<Vector2> = React.useRef<Vector2>({
		x: UNIFORMS.uResolution.value.x,
		y: UNIFORMS.uResolution.value.y,
	});
	const initialMousePosition = UNIFORMS.uMouse ? UNIFORMS.uMouse.defaultValue : { x: 0.5, y: 0.5 };
	const mousePosRef: React.MutableRefObject<Vector2> = React.useRef<Vector2>({
		x: size.current.x * initialMousePosition.x,
		y: size.current.y * -initialMousePosition.y,
	});
	const gl = React.useRef<WebGLRenderingContext>();
	const programRef: React.MutableRefObject<WebGLProgram> = React.useRef<WebGLProgram>();
	const loadedShadersRef: React.MutableRefObject<LoadedShaders> = React.useRef<LoadedShaders>({ fragmentShader: null, vertexShader: null });
	const uniformLocations = React.useRef<Record<string, WebGLUniformLocation>>();

	const initializeGLProps: InitializeProps = {
		gl,
		uniformLocations,
		canvasRef,
		fragmentSource: fragmentShader,
		vertexSource: vertexShader,
		programRef,
		loadedShadersRef,
		uniforms: UNIFORMS,
		size,
		meshType: MESH_TYPE.BASE_TRIANGLES,
	};
	useInitializeGL(initializeGLProps);

	useWindowSize(canvasRef, gl, UNIFORMS, size, false);

	useAnimationFrame(canvasRef, (time: number) => {
		render({
			gl: gl.current,
			uniformLocations: uniformLocations.current,
			uniforms: UNIFORMS,
			time,
			mousePos: mousePosRef.current,
		});
	});

	return (
		<div className={styles.canvasContainer}>
			<canvas ref={canvasRef} className={styles.fullScreenCanvas} width={size.current.x} height={size.current.y} aria-label='' role='img' />
		</div>
	);
};

export default Canvas;
