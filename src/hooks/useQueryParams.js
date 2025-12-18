import { useCallback, useState, useEffect } from "react";

export function useQueryParam(key) {
  const getValue = () => new URLSearchParams(window.location.search).get(key);

  const [value, setValue] = useState(getValue);

  useEffect(() => {
    const onPopState = () => {
      setValue(getValue());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setParam = useCallback(
    (newValue) => {
      const params = new URLSearchParams(window.location.search);

      if (newValue === null || newValue === undefined) {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }

      const newUrl = `${window.location.pathname}${
        params.toString() ? "?" + params.toString() : ""
      }`;

      window.history.replaceState({}, "", newUrl);
      setValue(newValue ?? null);
    },
    [key]
  );

  return [value, setParam];
}
