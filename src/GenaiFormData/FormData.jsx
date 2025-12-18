// pages/VoiceForm.jsx
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
} from "react";
import VoiceInputField from "./components/VoiceInputField";
import { useWebSpeech } from "../hooks/useWebSpeech";
import { Experience } from "../components/Experience";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";

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
      if (index >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayedText;
}

export default function FormData() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    city: "",
    pinCode: "",
  });

  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [script, setScript] = useState("Introduction");
  const [isComplete, setIsComplete] = useState(false);
  const [showSubmitPopup, setShowSubmitPopup] = useState(false);
  const [isLoading, setisLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  const fieldsOrder = [
    "firstName",
    "lastName",
    "phoneNumber",
    "city",
    "pinCode",
  ];

  const fieldToScriptMap = {
    firstName: "Introduction",
    lastName: "LastName",
    phoneNumber: "PhoneNumber",
    city: "City",
    pinCode: "Pincode",
  };

  const faceV2CallbackRef = useRef(null);

  const animatedFirstName = useTypingAnimation(formData.firstName);
  const animatedLastName = useTypingAnimation(formData.lastName);
  const animatedPhoneNumber = useTypingAnimation(formData.phoneNumber);
  const animatedCity = useTypingAnimation(formData.city);
  const animatedPinCode = useTypingAnimation(formData.pinCode);

  // ✅ SIMPLE SPEECH HANDLER
  const handleSpeech = useCallback(
    (text) => {
      console.log("🎤 Received:", text);

      if (!text || text.trim() === "") return;

      const currentField = fieldsOrder[currentFieldIndex];

      // ✅ Update form
      setFormData((prev) => ({
        ...prev,
        [currentField]: text.trim(),
      }));

      console.log(`✅ Set ${currentField} = "${text.trim()}"`);

      // ✅ Move to next field or complete
      const nextIndex = currentFieldIndex + 1;

      if (nextIndex < fieldsOrder.length) {
        const nextField = fieldsOrder[nextIndex];
        const nextScript = fieldToScriptMap[nextField];

        console.log(`➡️ Moving to: ${nextField}`);
        setCurrentFieldIndex(nextIndex);
        setScript(nextScript);
      } else {
        console.log("🎉 COMPLETE!");
        setIsComplete(true);
        setScript("Completion");
        setTimeout(() => setShowSubmitPopup(true), 500);
      }

      // ✅ Call callback
      if (faceV2CallbackRef.current) {
        faceV2CallbackRef.current();
      }
    },
    [currentFieldIndex, fieldsOrder, fieldToScriptMap]
  );

  const { isListening, startListening, stopListening } = useWebSpeech({
    onResult: handleSpeech,
  });

  const handleSubmit = () => {
    console.log("📤 Submitted:", formData);
    alert("Form submitted!\n\n" + JSON.stringify(formData, null, 2));
    setFormData({
      firstName: "",
      lastName: "",
      phoneNumber: "",
      city: "",
      pinCode: "",
    });
    setCurrentFieldIndex(0);
    setScript("Introduction");
    setIsComplete(false);
    setShowSubmitPopup(false);
  };

  const handleReset = () => {
    stopListening();
    setFormData({
      firstName: "",
      lastName: "",
      phoneNumber: "",
      city: "",
      pinCode: "",
    });
    setCurrentFieldIndex(0);
    setScript("Introduction");
    setIsComplete(false);
  };

  // ✅ Retry current field - prevent page reload
  const handleRetry = (fieldIndex, fieldScript) => {
    console.log("🔄 Retrying field:", fieldScript);
    setCurrentFieldIndex(fieldIndex);
    setScript(fieldScript);
    startListening();
  };

  return (
    <div className="h-full w-full flex bg-gray-50 overflow-hidden relative">
      <div className="w-full h-screen">
        <Canvas
          shadows
          camera={{ position: [0, 0, 8], fov: 45 }}
          className="h-screen"
        >
          <color attach="background" args={["#ececec"]} />
          {/* <Suspense
            fallback={
              <Html>
                <div className="text-3xl font-bold flex justify-center items-center h-full">
                  Loading...
                </div>
              </Html>
            }
          > */}
          <Experience
            script={script}
            startListening={startListening}
            faceV2CallbackRef={faceV2CallbackRef}
            faceRef={faceV2CallbackRef}
            setIsLoading={setisLoading}
            setIsCompleted={setIsCompleted}
            setShowLoader={setShowLoader}
            showLoader={showLoader}
          />
          {/* </Suspense> */}
        </Canvas>
      </div>

      <div className="w-full max-w-md bg-black backdrop-blur-lg  overflow-y-auto text-white">
        <div className="p-8 h-screen overflow-auto">
          <h2 className="text-3xl font-bold text-center mb-2 text-white">
            Meta Form
          </h2>

          <p className="text-center text-white text-sm mb-8">
            {isComplete
              ? " All fields complete!"
              : `${isListening ? "🎤 Listening..." : " Ready"} — ${
                  fieldsOrder[currentFieldIndex]
                }`}
          </p>

          {/* Form Fields */}
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => e.preventDefault()}
          >
            <div>
              <VoiceInputField
                label="First Name"
                value={animatedFirstName}
                active={currentFieldIndex === 0 && isListening}
              />
              {formData.firstName && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRetry(0, "Introduction");
                  }}
                  className="w-full mt-2 px-3 py-1 cursor-pointer text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                >
                  Re-record
                </button>
              )}
            </div>

            <div>
              <VoiceInputField
                label="Last Name"
                value={animatedLastName}
                active={currentFieldIndex === 1 && isListening}
              />
              {formData.lastName && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRetry(1, "LastName");
                  }}
                  className="w-full mt-2 px-3 py-1 cursor-pointer text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                >
                  Re-record
                </button>
              )}
            </div>

            <div>
              <VoiceInputField
                label="Phone Number"
                value={animatedPhoneNumber}
                active={currentFieldIndex === 2 && isListening}
              />
              {formData.phoneNumber && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRetry(2, "PhoneNumber");
                  }}
                  className="w-full mt-2 px-3 py-1  cursor-pointer text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                >
                  Re-record
                </button>
              )}
            </div>

            <div>
              <VoiceInputField
                label="City"
                value={animatedCity}
                active={currentFieldIndex === 3 && isListening}
              />
              {formData.city && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRetry(3, "City");
                  }}
                  className="w-full mt-2 px-3 py-1 cursor-pointer text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                >
                  Re-record
                </button>
              )}
            </div>

            <div>
              <VoiceInputField
                label="Pin Code"
                value={animatedPinCode}
                active={currentFieldIndex === 4 && isListening}
              />
              {formData.pinCode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRetry(4, "Pincode");
                  }}
                  className="w-full mt-2 px-3 py-1 cursor-pointer text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                >
                  Re-record
                </button>
              )}
            </div>
          </form>

          {!isComplete && !isListening && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                startListening();
              }}
              className="w-full mt-6 px-4 py-3 cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold flex items-center justify-center gap-2"
            >
              Listen Again
            </button>
          )}

          {/* Listening Indicator */}
          {isListening && !isComplete && (
            <div className="w-full mt-6 px-4 py-3 bg-green-100 border border-green-400 rounded-lg text-center">
              <p className="text-green-700 font-semibold">🎤 Listening...</p>
              <p className="text-sm text-green-600 mt-1">
                Speak now or click "Listen Again" to retry
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleReset();
            }}
            className="w-full mt-4 px-4 py-2 cursor-pointer bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-all"
          >
            Reset Form
          </button>
        </div>
      </div>

      {showSubmitPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-96 text-center">
            <h2 className="text-2xl font-semibold mb-4">🎉 All Complete!</h2>
            <p className="text-gray-700 mb-6">Ready to submit?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleSubmit()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Yes, Submit
              </button>
              <button
                onClick={() => setShowSubmitPopup(false)}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium"
              >
                No, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoader && (
        <div className="absolute bg-transparent backdrop-blur-lg  h-full flex flex-col items-center gap-3 left-0 right-0 top-0 bottom-0 justify-center">
          <div className="flex space-x-2">
            <div className="h-4 w-4 border-2 border-black rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="h-4 w-4 border-2 border-black rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="h-4 w-4 border-2 border-black rounded-full animate-bounce" />
          </div>
          <span className="text-lg font-medium text-black-700">
            Please wait…
          </span>
        </div>
      )}
      {/* {isLoading && !showLoader && (
        <div class="absolute top-[15%] right-0 left-[-10%] flex space-x-2 justify-center items-center">
          <div class="h-5 w-5 border-2 border-black rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div class="h-5 w-5 border-2 border-black rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div class="h-5 w-5 border-2 border-black rounded-full animate-bounce  [animation-delay:-0.25s]"></div>
          <div class="h-5 w-5 border-2 border-black rounded-full animate-bounce"></div>
        </div>
      )} */}
    </div>
  );
}
