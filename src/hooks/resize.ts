import { useEffect } from 'react';
import { FBO, Vector2, UniformSettings } from '../../types';

export const useWindowSize = (
	canvas: React.MutableRefObject<HTMLCanvasElement>,
	gl: React.MutableRefObject<WebGLRenderingContext>,
	uniforms: UniformSettings,
	size: React.MutableRefObject<Vector2>,
	useDevicePixelratio?: boolean
) => {
	const handleResize = () =>
		updateRendererSize(canvas, gl, uniforms, size, useDevicePixelratio);
	useEffect(() => {
		setTimeout(() => {
			handleResize();
		}, 0);

		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);
};

export const updateRendererSize = (
	canvas: React.MutableRefObject<HTMLCanvasElement>,
	gl: React.MutableRefObject<WebGLRenderingContext>,
	uniforms: UniformSettings,
	size: React.MutableRefObject<Vector2>,
	useDevicePixelratio?: boolean
) => {
	if (!canvas.current || !gl.current) return;
	const { width, height } = canvas.current.getBoundingClientRect();
	const devicePixelRatio = useDevicePixelratio
		? window.devicePixelRatio
		: 1.0;
	size.current = {
		x: width * devicePixelRatio,
		y: height * devicePixelRatio,
	};
	canvas.current.width = size.current.x;
	canvas.current.height = size.current.y;
	uniforms.uResolution.value = size.current;
	gl.current.viewport(0, 0, size.current.x, size.current.y);
};
