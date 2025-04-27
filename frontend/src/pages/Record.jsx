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

import Webcam from "react-webcam";
import axios from "axios";
import SpeechRecognition, {
	useSpeechRecognition,
} from "react-speech-recognition";

function convertBase64ToBlob(data) {
	const base64 = data.result;
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
			const reader = new FileReader();
			reader.readAsDataURL(file);

			return new Promise((resolve) => {
				setTimeout(() => {
					const blob = convertBase64ToBlob(reader);
					resolve(URL.createObjectURL(blob));
				}, 300);
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
		// @ts-ignore
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

function RecordPage() {
	const [content, setContent] = useState(DEFAULT);
	const [isRecording, setIsRecording] = useState(false);
	const [recordingTime, setRecordingTime] = useState(0);
	const [concentrationIndex, setConcentrationIndex] = useState(null);
	const webcamRef = useRef(null);
	const intervalRef = useRef(null);
	const timerRef = useRef(null);
	const {
		transcript,
		listening,
		resetTranscript,
		browserSupportsSpeechRecognition,
	} = useSpeechRecognition();

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
		resetTranscript();
		SpeechRecognition.startListening({ continuous: true });
	}, []);

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

	// Function to capture webcam snapshot and send to API
	const captureAndSendSnapshot = async () => {
		if (webcamRef.current) {
			console.log("Capturing snapshot...");
			const imageSrc = webcamRef.current.getScreenshot();

			if (imageSrc) {
				// Extract base64 data from the image src (remove the data:image/jpeg;base64, part)
				const base64Image = imageSrc.split(",")[1];

				try {
					const response = await axios.post(
						"http://127.0.0.1:5000/predict", // Changed from /api/v1/predict/
						{ image: base64Image }
					);

					// Axios automatically returns data in the response.data property

					setConcentrationIndex(response.data.concentration_index);
					console.log("Concentration Index:", response.data);
				} catch (error) {
					console.error("Error sending snapshot to API:", error);
				}
			}
		}
	};

	// Start recording function
	const startRecording = () => {
		setIsRecording(true);
		setRecordingTime(0);

		// Start the timer
		timerRef.current = setInterval(() => {
			setRecordingTime((prev) => prev + 1);
		}, 1000);

		// Start capturing snapshots every second
	};

	useEffect(() => {
		startRecording();

		// Store the interval reference
		const captureInterval = setInterval(() => {
			captureAndSendSnapshot();
		}, 1000); // Capture every second

		// Clean up
		return () => {
			clearInterval(captureInterval);
			stopRecording();
		};
	}, []);

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

	const [selectedAudioOption, setSelectedAudioOption] = useState("voice");

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
						<Webcam
							ref={webcamRef}
							videoConstraints={{
								facingMode: "user",
								width: 1280,
								height: 720,
							}}
							mirrored={true}
							screenshotFormat="image/jpeg"
							className="w-full h-full"
							onUserMedia={() => {}}
							onUserMediaError={() => {}}
						/>

						<div
							className={`mt-4 p-3 ${
								concentrationIndex > 0.3
									? "bg-green-200 border-1 border-green-800"
									: "bg-red-200 border-1 border-red-800"
							} rounded-md w-full flex justify-center items-center`}
						>
							{concentrationIndex > 0.3 ? "All good :)" : "Please refocus!"}
						</div>
					</div>
					<div>
						<div className="border-[1px] rounded-[10px] flex items-center w-[80%] mx-auto justify-center border-[#d7d7d7] gap-4 mt-5 py-4">
							<div
								className={`flex justify-center items-center gap-2 p-2 rounded-[10px] cursor-pointer ${
									selectedAudioOption === "voice" ? "bg-[#D7D7D7]" : ""
								}`}
								onClick={() => setSelectedAudioOption("voice")}
							>
								<Mic className="w-6 h-6 cursor-pointer" />
								<p className="text-xl">Voice</p>
							</div>
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
