"use client";
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

function Test() {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const [isLooking, setIsLooking] = useState(true);
	const [faceDetected, setFaceDetected] = useState(false);
	const [debugInfo, setDebugInfo] = useState({
		modelsLoaded: false,
		videoStarted: false,
		detectionRunning: false,
		lastError: "",
	});

	// Load models and start video feed
	useEffect(() => {
		const loadModels = async () => {
			try {
				setDebugInfo((prev) => ({
					...prev,
					lastError: "Starting model loading...",
				}));

				// The models folder should be in your public directory
				const MODEL_URL = "/models";

				// Load models one by one with logging
				setDebugInfo((prev) => ({
					...prev,
					lastError: "Loading TinyFaceDetector...",
				}));
				await faceapi.nets.tinyFaceDetector.load(MODEL_URL);

				setDebugInfo((prev) => ({
					...prev,
					lastError: "Loading FaceLandmark68Net...",
				}));
				await faceapi.nets.faceLandmark68Net.load(MODEL_URL);

				setDebugInfo((prev) => ({
					...prev,
					lastError: "All models loaded successfully",
				}));
				setDebugInfo((prev) => ({ ...prev, modelsLoaded: true }));

				startVideo();
			} catch (error) {
				console.error("Error loading models:", error);
				setDebugInfo((prev) => ({
					...prev,
					lastError: `Error loading models: ${
						error.message || "Unknown error"
					}`,
				}));
			}
		};

		const startVideo = () => {
			setDebugInfo((prev) => ({ ...prev, lastError: "Starting video..." }));
			navigator.mediaDevices
				.getUserMedia({
					video: {
						width: { ideal: 640 },
						height: { ideal: 480 },
						facingMode: "user",
					},
				})
				.then((stream) => {
					if (videoRef.current) {
						videoRef.current.srcObject = stream;
						setDebugInfo((prev) => ({
							...prev,
							videoStarted: true,
							lastError: "Video started successfully",
						}));
					}
				})
				.catch((err) => {
					console.error("Error accessing webcam: ", err);
					setDebugInfo((prev) => ({
						...prev,
						lastError: `Error accessing webcam: ${
							err.message || "Unknown error"
						}`,
					}));
				});
		};

		loadModels();

		// Cleanup on unmount
		return () => {
			if (videoRef.current && videoRef.current.srcObject) {
				videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
			}
		};
	}, []);

	// Setup canvas over video once video is playing
	useEffect(() => {
		if (!videoRef.current) return;

		const video = videoRef.current;

		video.addEventListener("playing", () => {
			if (!canvasRef.current) return;

			const canvas = canvasRef.current;
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			setDebugInfo((prev) => ({
				...prev,
				lastError: `Video playing. Dimensions: ${video.videoWidth}x${video.videoHeight}`,
			}));
		});
	}, []);

	// Eye tracking logic
	useEffect(() => {
		if (!debugInfo.modelsLoaded || !debugInfo.videoStarted) {
			return;
		}

		const detectFace = async () => {
			if (!videoRef.current || !canvasRef.current) {
				setDebugInfo((prev) => ({
					...prev,
					lastError: "Video or canvas ref not ready",
				}));
				return;
			}

			// Removed the problematic isLoaded check

			const video = videoRef.current;
			const canvas = canvasRef.current;

			// Make sure video is actually playing
			if (video.paused || video.ended || !video.videoWidth) {
				return;
			}

			setDebugInfo((prev) => ({
				...prev,
				detectionRunning: true,
				lastError: "Running face detection...",
			}));

			try {
				// Set dimensions each time to make sure they're correct
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				const displaySize = {
					width: video.videoWidth,
					height: video.videoHeight,
				};
				faceapi.matchDimensions(canvas, displaySize);

				// Run detection with explicit options
				const options = new faceapi.TinyFaceDetectorOptions({
					inputSize: 320,
					scoreThreshold: 0.5,
				});

				const detections = await faceapi
					.detectAllFaces(video, options)
					.withFaceLandmarks();

				const ctx = canvas.getContext("2d");
				ctx.clearRect(0, 0, canvas.width, canvas.height);

				if (detections && detections.length > 0) {
					setFaceDetected(true);
					setDebugInfo((prev) => ({
						...prev,
						lastError: `Face detected! Found ${detections.length} face(s)`,
					}));

					// Draw face detections
					const resizedDetections = faceapi.resizeResults(
						detections,
						displaySize
					);
					faceapi.draw.drawDetections(canvas, resizedDetections);
					faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

					// Process landmarks
					if (detections[0].landmarks) {
						const landmarks = detections[0].landmarks;
						const leftEye = landmarks.getLeftEye();
						const rightEye = landmarks.getRightEye();

						if (
							leftEye &&
							rightEye &&
							leftEye.length > 0 &&
							rightEye.length > 0
						) {
							const lookingStatus = analyzeEyeGaze(leftEye, rightEye);
							setIsLooking(lookingStatus);
						}
					}
				} else {
					setFaceDetected(false);
					setIsLooking(false);
					setDebugInfo((prev) => ({
						...prev,
						lastError: "No faces detected in frame",
					}));
				}
			} catch (error) {
				console.error("Error in face detection:", error);
				setDebugInfo((prev) => ({
					...prev,
					lastError: `Detection error: ${error.message || "Unknown error"}`,
				}));

				// Reset detection if error persists
				setDebugInfo((prev) => ({ ...prev, detectionRunning: false }));
			}
		};

		const analyzeEyeGaze = (leftEye, rightEye) => {
			try {
				// Draw eyes for debugging
				const canvas = canvasRef.current;
				const ctx = canvas.getContext("2d");

				// Draw eye points in red
				ctx.fillStyle = "red";
				leftEye.forEach((point) => {
					ctx.beginPath();
					ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
					ctx.fill();
				});

				rightEye.forEach((point) => {
					ctx.beginPath();
					ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
					ctx.fill();
				});

				// Calculate eye centers
				const leftEyeCenter = {
					x: leftEye.reduce((sum, pt) => sum + pt.x, 0) / leftEye.length,
					y: leftEye.reduce((sum, pt) => sum + pt.y, 0) / leftEye.length,
				};

				const rightEyeCenter = {
					x: rightEye.reduce((sum, pt) => sum + pt.x, 0) / rightEye.length,
					y: rightEye.reduce((sum, pt) => sum + pt.y, 0) / rightEye.length,
				};

				// Draw eye centers for debugging
				ctx.fillStyle = "blue";
				ctx.beginPath();
				ctx.arc(leftEyeCenter.x, leftEyeCenter.y, 4, 0, 2 * Math.PI);
				ctx.fill();

				ctx.beginPath();
				ctx.arc(rightEyeCenter.x, rightEyeCenter.y, 4, 0, 2 * Math.PI);
				ctx.fill();

				// Draw line between eyes
				ctx.strokeStyle = "yellow";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(leftEyeCenter.x, leftEyeCenter.y);
				ctx.lineTo(rightEyeCenter.x, rightEyeCenter.y);
				ctx.stroke();

				// Calculate eye direction using landmarks
				// Eye landmarks: inner corner (0), top (1,2), outer corner (3), bottom (4,5)
				const leftEyeInner = leftEye[0];
				const leftEyeOuter = leftEye[3];
				const rightEyeInner = rightEye[0];
				const rightEyeOuter = rightEye[3];

				// For vertical gaze
				const leftEyeTop = {
					x: (leftEye[1].x + leftEye[2].x) / 2,
					y: (leftEye[1].y + leftEye[2].y) / 2,
				};

				const leftEyeBottom = {
					x: (leftEye[4].x + leftEye[5].x) / 2,
					y: (leftEye[4].y + leftEye[5].y) / 2,
				};

				const rightEyeTop = {
					x: (rightEye[1].x + rightEye[2].x) / 2,
					y: (rightEye[1].y + rightEye[2].y) / 2,
				};

				const rightEyeBottom = {
					x: (rightEye[4].x + rightEye[5].x) / 2,
					y: (rightEye[4].y + rightEye[5].y) / 2,
				};

				// Calculate eye ratios
				// For horizontal gaze - compare inner/outer corner positions vs center
				const leftEyeHorizontalRatio =
					(leftEyeCenter.x - leftEyeInner.x) /
					(leftEyeOuter.x - leftEyeInner.x);

				const rightEyeHorizontalRatio =
					(rightEyeCenter.x - rightEyeInner.x) /
					(rightEyeOuter.x - rightEyeInner.x);

				// For vertical gaze
				const leftEyeVerticalRatio =
					(leftEyeCenter.y - leftEyeTop.y) / (leftEyeBottom.y - leftEyeTop.y);

				const rightEyeVerticalRatio =
					(rightEyeCenter.y - rightEyeTop.y) /
					(rightEyeBottom.y - rightEyeTop.y);

				// Log ratios for debug
				console.log({
					left: { h: leftEyeHorizontalRatio, v: leftEyeVerticalRatio },
					right: { h: rightEyeHorizontalRatio, v: rightEyeVerticalRatio },
				});

				// Define acceptable ranges
				const horizontalThreshold = 0.2; // How far from center is acceptable
				const verticalThreshold = 0.2;

				// Center is around 0.5 for both eyes
				const lookingHorizontal =
					Math.abs(leftEyeHorizontalRatio - 0.5) < horizontalThreshold &&
					Math.abs(rightEyeHorizontalRatio - 0.5) < horizontalThreshold;

				const lookingVertical =
					Math.abs(leftEyeVerticalRatio - 0.5) < verticalThreshold &&
					Math.abs(rightEyeVerticalRatio - 0.5) < verticalThreshold;

				return lookingHorizontal && lookingVertical;
			} catch (error) {
				console.error("Error analyzing eye gaze:", error);
				return false;
			}
		};

		// Run detection at regular intervals
		const intervalId = setInterval(detectFace, 200); // Reduced to 5 FPS for better performance

		// Clean up on unmount
		return () => clearInterval(intervalId);
	}, [debugInfo.modelsLoaded, debugInfo.videoStarted]);

	return (
		<div className="p-4">
			<h1 className="text-xl font-bold mb-4">
				{isLooking
					? "You are looking at the screen!"
					: "You are not looking at the screen!"}
			</h1>

			<div className="relative inline-block">
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					width="640"
					height="480"
					style={{ border: "1px solid black" }}
					onPlay={() =>
						setDebugInfo((prev) => ({ ...prev, videoStarted: true }))
					}
				/>
				<canvas
					ref={canvasRef}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
					}}
				/>
			</div>

			<div className="mt-4 p-4 bg-gray-100 rounded">
				<h2 className="font-bold">Debug Information:</h2>
				<ul className="list-disc pl-5">
					<li>Models loaded: {debugInfo.modelsLoaded ? "✅" : "❌"}</li>
					<li>Video started: {debugInfo.videoStarted ? "✅" : "❌"}</li>
					<li>Detection running: {debugInfo.detectionRunning ? "✅" : "❌"}</li>
					<li>Face detected: {faceDetected ? "✅" : "❌"}</li>
					<li>Looking at screen: {isLooking ? "✅" : "❌"}</li>
					<li>Last status: {debugInfo.lastError}</li>
				</ul>
			</div>

			<div className="mt-4">
				<h3 className="font-bold">Manual Testing:</h3>
				<p>Try these movements to check if eye detection works:</p>
				<ol className="list-decimal pl-5">
					<li>Look directly at the screen (should show "looking at screen")</li>
					<li>Look far left or right (should show "not looking at screen")</li>
					<li>Look up or down (should show "not looking at screen")</li>
					<li>Move closer or further from camera to test sensitivity</li>
				</ol>
			</div>
		</div>
	);
}

export default Test;
