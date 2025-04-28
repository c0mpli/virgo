"use client";
import Header from "@/components/Header";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { ArrowLeft, CircleStop, FileText, Mic, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import RichTextEditor from "reactjs-tiptap-editor";
import { BaseKit } from "reactjs-tiptap-editor";
import "reactjs-tiptap-editor/style.css";
import { Drawer } from "reactjs-tiptap-editor/drawer";
import "easydrawer/styles.css";
import {
	BubbleMenuTwitter,
	BubbleMenuKatex,
	BubbleMenuExcalidraw,
	BubbleMenuMermaid,
	BubbleMenuDrawer,
} from "reactjs-tiptap-editor/bubble-extra";
import { Attachment } from "reactjs-tiptap-editor/attachment";
import { Blockquote } from "reactjs-tiptap-editor/blockquote";
import { Bold } from "reactjs-tiptap-editor/bold";
import { BulletList } from "reactjs-tiptap-editor/bulletlist";
import { Clear } from "reactjs-tiptap-editor/clear";
import { Code } from "reactjs-tiptap-editor/code";
import { CodeBlock } from "reactjs-tiptap-editor/codeblock";
import { Color } from "reactjs-tiptap-editor/color";
import { ColumnActionButton } from "reactjs-tiptap-editor/multicolumn";
import { Emoji } from "reactjs-tiptap-editor/emoji";
import { ExportPdf } from "reactjs-tiptap-editor/exportpdf";
import { ExportWord } from "reactjs-tiptap-editor/exportword";
import { FontFamily } from "reactjs-tiptap-editor/fontfamily";
import { FontSize } from "reactjs-tiptap-editor/fontsize";
import { FormatPainter } from "reactjs-tiptap-editor/formatpainter";
import { Heading } from "reactjs-tiptap-editor/heading";
import { Highlight } from "reactjs-tiptap-editor/highlight";
import { History } from "reactjs-tiptap-editor/history";
import { Image } from "reactjs-tiptap-editor/image";
import { Indent } from "reactjs-tiptap-editor/indent";
import { Italic } from "reactjs-tiptap-editor/italic";
import { LineHeight } from "reactjs-tiptap-editor/lineheight";
import { Link } from "reactjs-tiptap-editor/link";
import { MoreMark } from "reactjs-tiptap-editor/moremark";
import { OrderedList } from "reactjs-tiptap-editor/orderedlist";
import { SearchAndReplace } from "reactjs-tiptap-editor/searchandreplace";
import { Strike } from "reactjs-tiptap-editor/strike";
import { Table } from "reactjs-tiptap-editor/table";
import { TableOfContents } from "reactjs-tiptap-editor/tableofcontent";
import { TaskList } from "reactjs-tiptap-editor/tasklist";
import { TextAlign } from "reactjs-tiptap-editor/textalign";
import { TextUnderline } from "reactjs-tiptap-editor/textunderline";

import SpeechRecognition, {
	useSpeechRecognition,
} from "react-speech-recognition";
import * as faceapi from "face-api.js";

function convertBase64ToBlob(base64Data) {
	// Check if base64Data is a string or an object with a result property
	const base64 =
		typeof base64Data === "string" ? base64Data : base64Data.result;

	if (typeof base64 !== "string") {
		throw new Error("Provided input is not a string");
	}

	// Check if the base64 string is properly formatted
	const base64Pattern = /^data:(.*?);base64,(.*)$/;
	const matches = base64.match(base64Pattern);

	if (!matches) {
		throw new Error("Invalid base64 string format");
	}

	const mime = matches[1]; // MIME type (e.g., image/png)
	const bstr = atob(matches[2]); // Base64 decoded data
	const n = bstr.length;
	const u8arr = new Uint8Array(n);

	// Convert binary string to a byte array
	for (let i = 0; i < n; i++) {
		u8arr[i] = bstr.charCodeAt(i);
	}

	return new Blob([u8arr], { type: mime });
}

const extensions = [
	BaseKit.configure({
		// Show placeholder
		placeholder: {
			showOnlyCurrent: true,
		},

		// Character count
		characterCount: {
			limit: 50_000,
		},
	}),
	History,
	SearchAndReplace,
	TableOfContents,
	FormatPainter.configure({ spacer: true }),
	Clear,
	FontFamily,
	Heading.configure({ spacer: true }),
	FontSize,
	Bold,
	Italic,
	TextUnderline,
	Strike,
	MoreMark,
	Emoji,
	Color.configure({ spacer: true }),
	Highlight,
	BulletList,
	OrderedList,
	TextAlign.configure({ types: ["heading", "paragraph"], spacer: true }),
	Indent,
	LineHeight,
	TaskList.configure({
		spacer: true,
		taskItem: {
			nested: true,
		},
	}),
	Link,
	Image.configure({
		upload: (files) => {
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve(URL.createObjectURL(files));
				}, 500);
			});
		},
	}),
	Table,
	ExportPdf.configure({ spacer: true }),

	Drawer.configure({
		upload: (file) => {
			// fake upload return base 64
			return new Promise((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => {
					setTimeout(() => {
						resolve(URL.createObjectURL(file));
					}, 300);
				};
				reader.readAsDataURL(file);
			});
		},
	}),
	// Import Extensions Here
];

const DEFAULT = ``;

function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

function RecordPage() {
	const [content, setContent] = useState(DEFAULT);
	const [isRecording, setIsRecording] = useState(false);
	const [recordingTime, setRecordingTime] = useState(0);
	const intervalRef = useRef(null);
	const timerRef = useRef(null);
	const {
		transcript,
		listening,
		resetTranscript,
		browserSupportsSpeechRecognition,
	} = useSpeechRecognition();

	// Face detection states
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

	if (!browserSupportsSpeechRecognition) {
		console.log("Browser does not support speech recognition.");
	}

	useEffect(() => {
		if (listening) {
			console.log("Listening...");
		} else {
			console.log("Not listening...");
		}
	}, [listening]);

	useEffect(() => {
		// Only start speech recognition if we're recording
		if (isRecording) {
			resetTranscript();
			SpeechRecognition.startListening({ continuous: true });
		} else {
			SpeechRecognition.stopListening();
		}
	}, [isRecording, resetTranscript]);

	const router = useRouter();

	const onChangeContent = (value) => {
		setContent(value);
	};

	const onValueChange = useCallback(
		debounce((value) => {
			setContent(value);
		}, 300),
		[]
	);

	// Format time as mm:ss
	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
	};

	// Start recording function
	const startRecording = () => {
		setIsRecording(true);
		setRecordingTime(0);

		// Start the timer
		timerRef.current = setInterval(() => {
			setRecordingTime((prev) => prev + 1);
		}, 1000);
	};

	// Stop recording function
	const stopRecording = () => {
		setIsRecording(false);

		// Clear intervals
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}

		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
	};

	// Clean up on unmount
	useEffect(() => {
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, []);

	// Load face-api models and start video feed
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
		const intervalId = setInterval(detectFace, 200); // 5 FPS for better performance

		// Clean up on unmount
		return () => clearInterval(intervalId);
	}, [debugInfo.modelsLoaded, debugInfo.videoStarted]);

	const [selectedAudioOption, setSelectedAudioOption] = useState("text");

	return (
		<div className="min-h-[100vh] pb-10">
			<Header full={true} />
			<div className="grid grid-cols-[auto_25%] mx-10 mt-2 gap-10">
				<div className="">
					<div className="flex items-center gap-2">
						<ArrowLeft
							className="w-8 h-8 cursor-pointer"
							onClick={() => router.back()}
						/>
						<input
							type="text"
							placeholder="Search"
							className="border-2 border-gray-300 rounded-md p-2 w-full mt-2"
							value={"New Event"}
							onChange={(e) => {}}
						/>
						{!isRecording ? (
							<Play
								className="w-8 h-8 cursor-pointer"
								onClick={startRecording}
							/>
						) : (
							<CircleStop
								className="w-8 h-8 cursor-pointer text-red-500"
								onClick={stopRecording}
							/>
						)}
						<p>{formatTime(recordingTime)}</p>
					</div>
					<div className="mt-10 pb-10">
						<RichTextEditor
							output="html"
							content={content}
							onChangeContent={onValueChange}
							extensions={extensions}
							dark={false}
							bubbleMenu={{
								render(
									{ extensionsNames, editor, disabled },
									bubbleDefaultDom
								) {},
							}}
						/>
					</div>
				</div>
				<div className="border-l-[1px] border-[#d7d7d7] min-h-[84vh] ">
					<div className="mt-3 ml-5 mx-auto flex flex-col justify-center items-center w-full">
						<div className="relative w-full">
							<video
								ref={videoRef}
								autoPlay
								playsInline
								muted
								className="w-full h-full"
								onPlay={() =>
									setDebugInfo((prev) => ({ ...prev, videoStarted: true }))
								}
							/>
							<canvas
								ref={canvasRef}
								className="absolute top-0 left-0 w-full h-full"
							/>
						</div>

						<div
							className={`mt-4 p-3 ${
								isLooking
									? "bg-green-200 border-1 border-green-800"
									: "bg-red-200 border-1 border-red-800"
							} rounded-md w-full flex justify-center items-center`}
						>
							{isLooking ? "All good :)" : "Please refocus!"}
						</div>
					</div>
					<div>
						<div className="border-[1px] rounded-[10px] flex items-center w-[80%] mx-auto justify-center border-[#d7d7d7] gap-4 mt-5 py-4">
							{/* <div
								className={`flex justify-center items-center gap-2 p-2 rounded-[10px] cursor-pointer ${
									selectedAudioOption === "voice" ? "bg-[#D7D7D7]" : ""
								}`}
								onClick={() => setSelectedAudioOption("voice")}
							>
								<Mic className="w-6 h-6 cursor-pointer" />
								<p className="text-xl">Voice</p>
							</div> */}
							<div
								className={`flex justify-center items-center gap-2 p-2 rounded-[10px] cursor-pointer ${
									selectedAudioOption === "text" ? "bg-[#D7D7D7]" : ""
								}`}
								onClick={() => setSelectedAudioOption("text")}
							>
								<FileText className="w-6 h-6 cursor-pointer" />
								<p className="text-xl">Transcript</p>
							</div>
						</div>
						<div className="flex flex-col gap-2 mt-5">
							{selectedAudioOption === "voice" && (
								<div className="flex flex-col gap-2">
									<p className="text-xl">Voice</p>
									<p>{}</p>
								</div>
							)}
							{selectedAudioOption === "text" && (
								<div className="flex flex-col gap-2 mx-6 overflow-y-auto h-[230px]">
									<p>{transcript}</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default RecordPage;
