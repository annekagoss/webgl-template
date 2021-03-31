import { useEffect, useRef } from 'react';

import { clamp, interpolate } from '../../lib/gl/math';
import { Vector2 } from '../../types';
import { easeInOutQuad } from '../utils/transition';

import { throttle } from './helpers';

const SNAP_DURATION = 20;

export const useScrollJack = (numItems: number, activePageIndex: number, onScroll: () => void, onIndexChange: (index: number) => void) => {
	const currentIndexRef: React.MutableRefObject<number> = useRef<number>(0);
	const frameRequestRef: React.MutableRefObject<number> = useRef<number>(0);
	const frameRef: React.MutableRefObject<number> = useRef<number>(0);
	const isAnimatingRef: React.MutableRefObject<Boolean> = useRef<Boolean>(false);
	const firstTimeRef: React.MutableRefObject<Boolean> = useRef<Boolean>(true);

	const scrollHandler = throttle(20, (e: WheelEvent) => handleScroll(e, currentIndexRef, frameRequestRef, frameRef, isAnimatingRef, firstTimeRef, onScroll, onIndexChange, numItems));

	const flipToIndex = (shouldAnimate: Boolean) => {
		scrollToIndex(activePageIndex, currentIndexRef, frameRequestRef, frameRef, isAnimatingRef, onScroll, shouldAnimate);
		firstTimeRef.current = false;
	};

	const resizeHandler = throttle(20, (e: WheelEvent) => flipToIndex(false));

	useEffect(() => {
		window.addEventListener('mousewheel', scrollHandler);
		window.addEventListener('resize', () => resizeHandler);
		return () => {
			window.removeEventListener('mousewheel', scrollHandler);
			window.removeEventListener('resize', () => resizeHandler);
		};
	}, []);

	useEffect(() => {
		// Index was changed by navigation, not scrolling
		if (activePageIndex !== currentIndexRef.current) {
			flipToIndex(!firstTimeRef.current);
		}
		firstTimeRef.current = false;
	}, [activePageIndex]);
};

const scrollToIndex = (
	activePageIndex: number,
	currentIndexRef: React.MutableRefObject<number>,
	frameRequestRef: React.MutableRefObject<number>,
	frameRef: React.MutableRefObject<number>,
	isAnimatingRef: React.MutableRefObject<Boolean>,
	onScroll: () => void,
	shouldAnimate: Boolean
) => {
	if (isAnimatingRef.current) return;

	frameRef.current = 0;
	currentIndexRef.current = activePageIndex;

	if (!shouldAnimate) {
		window.scrollTo(0, activePageIndex * window.innerHeight);
		return;
	}

	isAnimatingRef.current = true;

	animate(
		window.scrollY,
		activePageIndex * window.innerHeight,
		frameRequestRef,
		frameRef,
		() => onScroll(),
		() => {
			cancelAnimationFrame(frameRequestRef.current);
			isAnimatingRef.current = false;
		}
	);
};

const handleScroll = (
	e: WheelEvent,
	currentIndexRef: React.MutableRefObject<number>,
	frameRequestRef: React.MutableRefObject<number>,
	frameRef: React.MutableRefObject<number>,
	isAnimatingRef: React.MutableRefObject<Boolean>,
	firstTimeRef: React.MutableRefObject<Boolean>,
	onScroll: () => void,
	onIndexChange: (index: number) => void,
	numItems: number
) => {
	if (Math.abs(e.deltaY) < 20) return;

	if (isAnimatingRef.current) return;
	isAnimatingRef.current = true;
	const direction: number = e.deltaY > 0 ? 1 : -1;
	const nextInterval = clamp(currentIndexRef.current + direction, 0, numItems - 1);
	frameRef.current = 0;
	currentIndexRef.current = nextInterval;
	firstTimeRef.current = false;
	onIndexChange(nextInterval);

	animate(
		window.scrollY,
		nextInterval * window.innerHeight,
		frameRequestRef,
		frameRef,
		() => onScroll(),
		() => {
			cancelAnimationFrame(frameRequestRef.current);
			isAnimatingRef.current = false;
		}
	);
};

const animate = (origin: number, target: number, frameRequestRef: React.MutableRefObject<number>, frameRef: React.MutableRefObject<number>, onScroll: () => void, onComplete: () => void) => {
	if (frameRef.current > SNAP_DURATION) {
		onComplete();
		return;
	}

	const progress = easeInOutQuad(frameRef.current, 0, 1, SNAP_DURATION);
	const scrollTarget = interpolate(origin, target, progress);
	window.scrollTo(0, scrollTarget);
	onScroll();
	frameRequestRef.current = requestAnimationFrame(() => animate(origin, target, frameRequestRef, frameRef, onScroll, onComplete));
	frameRef.current++;
};
