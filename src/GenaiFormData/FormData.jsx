import React, { useState, useCallback, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Leva } from "leva";
import { useWebSpeech } from "../hooks/useWebSpeech";
import Experience from "../components/Experience";

export default function VoiceForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [message, setMessage] = useState("");
  const [modelUrl, setModelUrl] = useState(null);

  const faceRef = useRef(null);

  const sendMessage = useCallback((text) => {
    const value = text?.trim();
    if (!value) return;
    faceRef.current?.speak(value);
    setMessage("");
  }, []);

  const handleSpeech = useCallback(
    (text) => {
      if (!text?.trim()) {
        sendMessage("i didn't catch that, could you please repeat?");
        return;
      }
      sendMessage(text);
    },
    [sendMessage]
  );

  const { isListening, startListening, stopListening } = useWebSpeech({
    onResult: handleSpeech,
  });

  const toggleMic = () => {
    isListening ? stopListening() : startListening();
  };

  const handleModelUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith(".glb")) return;
    const url = URL.createObjectURL(file);
    setModelUrl(url);
  };

  useEffect(() => {
    return () => {
      if (modelUrl) URL.revokeObjectURL(modelUrl);
    };
  }, [modelUrl]);

  return (
    <div className="h-screen w-full flex relative bg-gray-50">
      <Leva
        collapsed={false}
        theme={{
          sizes: {
            rootWidth: "480px",
            controlHeight: "34px",
            titleBarHeight: "38px",
            folderTitleHeight: "38px",
            rowHeight: "43px",
            numberInputMinWidth: "80px",
          },
          fontSizes: {
            root: "15px",
            folder: "16px",
            input: "15px",
            toolTip: "14px",
          },
        }}
      />

      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <color attach="background" args={["#ececec"]} />
        <Environment preset="sunset" />
        <Experience
          faceRef={faceRef}
          startListening={startListening}
          setIsLoading={setIsLoading}
          setIsCompleted={setIsCompleted}
          setShowLoader={setShowLoader}
          showLoader={showLoader}
          modelUrl={modelUrl}
        />
      </Canvas>

      {/* {!showLoader && ( */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-transparent backdrop-blur-lg rounded-xl shadow-lg flex gap-2">
        <label className="px-3 py-2 rounded-full bg-gray-200 cursor-pointer">
          Upload
          <input type="file" accept=".glb" onChange={handleModelUpload} className="hidden" />
        </label>

        <button
          onClick={toggleMic}
          disabled={isLoading || isCompleted}
          className={`px-3 py-2 rounded-full ${isListening ? "bg-green-500 text-white" : "bg-gray-200"}`}
        >
          {isListening ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              {" "}
              <g clip-path="url(#clip0_13155_63964)">
                {" "}
                <path
                  d="M15.832 7.49992C16.053 7.49992 16.265 7.58772 16.4213 7.744C16.5776 7.90028 16.6654 8.11224 16.6654 8.33325C16.6655 9.95702 16.0731 11.525 14.9992 12.743C13.9253 13.9609 12.4439 14.7451 10.8329 14.9483L10.832 16.6666H13.332C13.553 16.6666 13.765 16.7544 13.9213 16.9107C14.0776 17.0669 14.1654 17.2789 14.1654 17.4999C14.1654 17.7209 14.0776 17.9329 13.9213 18.0892C13.765 18.2455 13.553 18.3333 13.332 18.3333H6.66536C6.44435 18.3333 6.23239 18.2455 6.07611 18.0892C5.91983 17.9329 5.83203 17.7209 5.83203 17.4999C5.83203 17.2789 5.91983 17.0669 6.07611 16.9107C6.23239 16.7544 6.44435 16.6666 6.66536 16.6666H9.16536V14.9483C7.55421 14.7453 6.07254 13.9612 4.99849 12.7432C3.92445 11.5253 3.33188 9.95714 3.33203 8.33325C3.33203 8.11224 3.41983 7.90028 3.57611 7.744C3.73239 7.58772 3.94435 7.49992 4.16536 7.49992C4.38638 7.49992 4.59834 7.58772 4.75462 7.744C4.9109 7.90028 4.9987 8.11224 4.9987 8.33325C4.9987 9.65933 5.52548 10.9311 6.46316 11.8688C7.40085 12.8065 8.67262 13.3333 9.9987 13.3333C11.3248 13.3333 12.5965 12.8065 13.5342 11.8688C14.4719 10.9311 14.9987 9.65933 14.9987 8.33325C14.9987 8.11224 15.0865 7.90028 15.2428 7.744C15.3991 7.58772 15.611 7.49992 15.832 7.49992ZM9.9987 0.833252C10.8828 0.833252 11.7306 1.18444 12.3557 1.80956C12.9808 2.43468 13.332 3.28253 13.332 4.16659V8.33325C13.332 9.21731 12.9808 10.0652 12.3557 10.6903C11.7306 11.3154 10.8828 11.6666 9.9987 11.6666C9.11464 11.6666 8.2668 11.3154 7.64167 10.6903C7.01655 10.0652 6.66536 9.21731 6.66536 8.33325V4.16659C6.66536 3.28253 7.01655 2.43468 7.64167 1.80956C8.2668 1.18444 9.11464 0.833252 9.9987 0.833252Z"
                  fill="black"
                />{" "}
              </g>{" "}
              <defs>
                {" "}
                <clipPath id="clip0_13155_63964">
                  {" "}
                  <rect width="20" height="20" fill="white" />{" "}
                </clipPath>{" "}
              </defs>{" "}
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              {" "}
              <g clip-path="url(#clip0_13155_64112)">
                {" "}
                <path
                  d="M2.5 2.5L17.5 17.5"
                  stroke="black"
                  strokeWidth="1.66667"
                  strokeinecap="round"
                  strokeLinejoin="round"
                />{" "}
                <path
                  d="M7.5 4.16663C7.5 3.50358 7.76339 2.8677 8.23223 2.39886C8.70107 1.93002 9.33696 1.66663 10 1.66663C10.663 1.66663 11.2989 1.93002 11.7678 2.39886C12.2366 2.8677 12.5 3.50358 12.5 4.16663V8.33329C12.5 8.58009 12.4635 8.82553 12.3917 9.06163M10.725 10.7283C10.3514 10.8415 9.95647 10.8656 9.57186 10.7988C9.18724 10.7319 8.82363 10.5759 8.51015 10.3433C8.19666 10.1107 7.94201 9.80783 7.7666 9.45907C7.59118 9.11032 7.49988 8.72534 7.5 8.33496V7.50163"
                  stroke="black"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />{" "}
                <path
                  d="M4.16797 8.33325C4.16779 9.38604 4.45252 10.4193 4.99198 11.3233C5.53144 12.2274 6.30551 12.9686 7.23211 13.4684C8.1587 13.9682 9.20328 14.2079 10.2551 14.1621C11.3069 14.1163 12.3267 13.7867 13.2063 13.2083M14.873 11.5416C15.5012 10.5896 15.835 9.47378 15.833 8.33325"
                  stroke="black"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />{" "}
                <path
                  d="M6.66797 17.5H13.3346"
                  stroke="black"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />{" "}
                <path
                  d="M10 14.1666V17.5"
                  stroke="black"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />{" "}
              </g>{" "}
              <defs>
                {" "}
                <clipPath id="clip0_13155_64112">
                  {" "}
                  <rect width="20" height="20" fill="white" />{" "}
                </clipPath>{" "}
              </defs>{" "}
            </svg>
          )}
        </button>

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Speak or Enter the Message..."
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none"
        />

        <button
          onClick={() => sendMessage(message)}
          disabled={isLoading || isCompleted}
          className="px-3 py-2 bg-black text-white rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </div>
      {/* )} */}
      {isLoading && !showLoader && (
        <div className="absolute top-[15%] right-0 left-[15%] flex space-x-2 justify-center items-center">
          <div className="h-5 w-5 border-2 border-black rounded-full animate-bounce" />
          <div className="h-5 w-5 border-2 border-black rounded-full animate-bounce" />
          <div className="h-5 w-5 border-2 border-black rounded-full animate-bounce" />
          <div className="h-5 w-5 border-2 border-black rounded-full animate-bounce" />
        </div>
      )}
      {showLoader && (
        <div className="absolute backdrop-blur-lg h-full flex flex-col items-center gap-3 left-0 right-0 top-0 bottom-0 justify-center">
          <div className="flex space-x-2">
            <div className="h-4 w-4 border-2 border-black rounded-full animate-bounce" />
            <div className="h-4 w-4 border-2 border-black rounded-full animate-bounce" />
            <div className="h-4 w-4 border-2 border-black rounded-full animate-bounce" />
          </div>
          <span className="text-lg font-medium">Please wait…</span>
        </div>
      )}
    </div>
  );
}
