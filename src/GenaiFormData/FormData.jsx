// pages/VoiceForm.jsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import VoiceInputField from "./components/VoiceInputField";
import ThreeModel from "./components/ThreeModel";
import { useWebSpeech } from "../hooks/useWebSpeech";
import { Experience } from "../components/Experience";
import { Canvas } from "@react-three/fiber";

// Typing Animation Hook
function useTypingAnimation(text, speed = 50) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, index + 1));
      index++;
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return displayedText;
}

export default function FormData() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    PhoneNumber: "",
    City: "",
    pinCode: "",
  });
  const [currentField, setCurrentField] = useState("firstName");
  const [audioFile, setAudioFile] = useState("Introduction");
  const [scriptStatus, setScriptStatus] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");
  const [manualMode, setManualMode] = useState(false);

  const fieldsOrder = [
    "firstName",
    "lastName",
    "PhoneNumber",
    "City",
    "pinCode",
  ];
  const formDataRef = useRef(formData);

  // Typing animation for each field
  const animatedFirstName = useTypingAnimation(formData.firstName);
  const animatedLastName = useTypingAnimation(formData.lastName);
  const animatedPhoneNumber = useTypingAnimation(formData.PhoneNumber);
  const animatedCity = useTypingAnimation(formData.City);
  const animatedPinCode = useTypingAnimation(formData.pinCode);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const handleSpeech = useCallback(
    (text) => {
      if (!text || text.trim() === "") return;

      // Handle errors
      if (text.startsWith("Error:")) {
        console.error("❌ Speech error:", text);
        setError(text);
        setTimeout(() => setError(""), 3000);
        return;
      }

      console.log(`🎤 Captured "${text.trim()}" for ${currentField}`);
      setError("");

      setFormData((prev) => {
        const updated = {
          ...prev,
          [currentField]: text.trim(),
        };
        console.log("📝 Updated form:", updated);
        return updated;
      });

      // Move to next field
      const nextIndex = fieldsOrder.indexOf(currentField) + 1;
      if (nextIndex < fieldsOrder.length) {
        setTimeout(() => {
          setCurrentField(fieldsOrder[nextIndex]);
        }, 500);
      } else {
        // All fields complete
        setTimeout(() => {
          setIsComplete(true);
          console.log("✅ All fields captured:", formDataRef.current);
        }, 500);
      }
    },
    [currentField]
  );

  const { isListening, startListening, stopListening } = useWebSpeech({
    onResult: handleSpeech,
    onListeningStart: () => console.log("🎤 Microphone ON"),
    onListeningStop: () => console.log("🎤 Microphone OFF"),
  });

  useEffect(() => {
    console.log("🎧 Now listening for:", currentField);
    if (!isComplete && currentField) {
      if (currentField === "lastName") {
        setAudioFile("LastName");
      } else if (currentField === "PhoneNumber") {
        setAudioFile("PhoneNumber");
      } else if (currentField === "City") {
        setAudioFile("City");
      } else if (currentField === "pinCode") {
        setAudioFile("Pincode");
      }

      // startListening();
      console.log("started");
    }
  }, [currentField, manualMode, isComplete, startListening]);

  const handleReset = () => {
    setFormData({
      firstName: "",
      lastName: "",
      PhoneNumber: "",
      City: "",
      pinCode: "",
    });
    setCurrentField("firstName");
    setIsComplete(false);
    setError("");
    stopListening();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("📤 Submitting form:", formData);
    alert("Form submitted! Check console for data.");
  };

  return (
    <div className="h-full flex  overflow-hidden bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="w-full h-screen overflow-hidden">
        {" "}
        {/* <ThreeModel /> */}
        <Canvas
          shadows
          camera={{ position: [0, 0, 8], fov: 45 }}
          className="h-screen"
        >
          <color attach="background" args={["#ececec"]} />
          <Experience
            script={audioFile}
            scriptStatus={scriptStatus}
            setScriptStatus={setScriptStatus}
            startListening={startListening}
          />
        </Canvas>
      </div>
      <div className="w-full bg-white shadow-2xl   border border-gray-200">
        <h2 className="text-2xl font-bold text-center text-gray-800 pt-8">
          Meta Form
        </h2>
        {/* {error && (
          <p className="text-center text-red-500 font-medium mt-4">{error}</p>
        )} */}
        {/* <p className="text-center text-gray-500 text-sm mb-6">
          {isComplete
            ? "✅ Form Complete!"
            : `${
                isListening ? "🎤 Listening" : "🔴 Not Listening"
              } - ${currentField}`}
        </p> */}
        {/* Status Bar */}
        {currentField !== "firstName" && (
          <div className="m-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isListening
                  ? "bg-linear-to-r from-green-500 to-green-600"
                  : "bg-linear-to-r from-blue-500 to-indigo-600"
              }`}
              style={{
                width: `${
                  ((fieldsOrder.indexOf(currentField) + 1) /
                    fieldsOrder.length) *
                  100
                }%`,
              }}
            />
          </div>
        )}

        {/* Mode Toggle
        <div className="mb-6 flex gap-2">
          <button
            onClick={toggleManualMode}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition ${
              manualMode
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {manualMode ? "📱 Manual Mode" : "🤖 Auto Mode"}
          </button>
        </div> */}
        {/* Manual Controls (visible when in manual mode) */}
        {/* {manualMode && (
          <div className="mb-6 flex gap-2">
            <button
              onClick={startListening}
              disabled={isListening}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition ${
                isListening
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              ▶️ Start Listening
            </button>
            <button
              onClick={stopListening}
              disabled={!isListening}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition ${
                !isListening
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              ⏹️ Stop Listening
            </button>
          </div>
        )} */}

        <form className="flex flex-col gap-6 p-6" onSubmit={handleSubmit}>
          <VoiceInputField
            label="First Name"
            name="firstName"
            value={animatedFirstName}
            active={currentField === "firstName" && isListening}
          />
          <VoiceInputField
            label="Last Name"
            name="lastName"
            value={animatedLastName}
            active={currentField === "lastName" && isListening}
          />
          <VoiceInputField
            label="Phone Number"
            name="PhoneNumber"
            value={animatedPhoneNumber}
            active={currentField === "PhoneNumber" && isListening}
          />
          <VoiceInputField
            label="City"
            name="City"
            value={animatedCity}
            active={currentField === "City" && isListening}
          />
          <VoiceInputField
            label="Pin Code"
            name="pinCode"
            value={animatedPinCode}
            active={currentField === "pinCode" && isListening}
          />
        </form>
        {/* <div className="flex gap-3 mt-8">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition"
          >
            Reset
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isComplete}
            className={`flex-1 px-4 py-2 font-semibold rounded-lg transition ${
              isComplete
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Submit
          </button>
        </div> */}
        {/* Data Display */}
        {/* {isComplete && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
            <h3 className="font-semibold text-gray-700 mb-3">Captured Data:</h3>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-600">First Name:</span>
                <p className="text-gray-800 font-mono break-words">
                  {formData.firstName}
                </p>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-600">Last Name:</span>
                <p className="text-gray-800 font-mono break-words">
                  {formData.lastName}
                </p>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-600">Email:</span>
                <p className="text-gray-800 font-mono break-words">
                  {formData.email}
                </p>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}
