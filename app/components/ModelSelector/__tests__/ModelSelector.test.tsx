import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

let mockIsMobile = false;
const mockUseQuery = jest.fn();

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  value: class ResizeObserverMock {
    observe() {
      return undefined;
    }

    unobserve() {
      return undefined;
    }

    disconnect() {
      return undefined;
    }
  },
});

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobile,
}));

jest.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

const { ModelSelector } = jest.requireActual<
  typeof import("../../ModelSelector")
>("../../ModelSelector");

describe("ModelSelector", () => {
  beforeEach(() => {
    mockIsMobile = false;
    mockUseQuery.mockClear();
    window.localStorage.clear();
  });

  it("shows OpenRouter for a saved hosted tier", () => {
    render(
      <ModelSelector value="hackerai-pro" onChange={jest.fn()} mode="agent" />,
    );

    expect(screen.getByRole("button", { name: "OpenRouter" })).toBeVisible();
  });

  it("offers connections and not hosted Auto, Standard, Pro, or Max", () => {
    render(<ModelSelector value="auto" onChange={jest.fn()} mode="ask" />);

    fireEvent.click(screen.getByRole("button", { name: "OpenRouter" }));

    expect(screen.queryByRole("button", { name: /^Auto$/i })).toBeNull();
    expect(screen.queryByText("HackerAI Standard")).toBeNull();
    expect(screen.queryByText("HackerAI Pro")).toBeNull();
    expect(screen.queryByText("HackerAI Max")).toBeNull();
    expect(screen.queryByText(/Get access to paid models/i)).toBeNull();
    expect(
      screen.getByText("Any OpenRouter model, including Auto"),
    ).toBeVisible();
    expect(screen.getByText("OpenAI-compatible")).toBeVisible();
    expect(screen.getByText("Ollama")).toBeVisible();
    expect(screen.getByText("vLLM")).toBeVisible();
    expect(screen.getByText("Hermes")).toBeVisible();
    expect(screen.getByText("Unsloth")).toBeVisible();
    expect(screen.queryByText(/Runpod port 8000/i)).not.toBeInTheDocument();
  });

  it("selects vLLM and shows how to serve it", () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <ModelSelector
        value="byom-openrouter"
        onChange={onChange}
        mode="agent"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "OpenRouter" }));
    fireEvent.click(screen.getByRole("button", { name: /vLLM/i }));

    expect(onChange).toHaveBeenCalledWith("byom-vllm");

    rerender(
      <ModelSelector value="byom-vllm" onChange={onChange} mode="agent" />,
    );

    expect(screen.getByText(/vllm serve/i)).toBeVisible();
    expect(screen.getByText(/Runpod port 8000/i)).toBeVisible();
  });

  it("shows Unsloth Dynamic GGUF guidance when that connection is selected", () => {
    render(
      <ModelSelector value="byom-unsloth" onChange={jest.fn()} mode="agent" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Unsloth" }));

    expect(screen.getByText(/UD-Q4_K_XL/)).toBeVisible();
    expect(screen.getByText(/save_pretrained_gguf/)).toBeVisible();
  });

  it("does not query a hosted Max entitlement", () => {
    render(<ModelSelector value="auto" onChange={jest.fn()} mode="agent" />);

    fireEvent.click(screen.getByRole("button", { name: "OpenRouter" }));

    expect(mockUseQuery).not.toHaveBeenCalled();
  });

  it("names the mobile sheet after the chat mode", () => {
    mockIsMobile = true;
    render(<ModelSelector value="auto" onChange={jest.fn()} mode="agent" />);

    fireEvent.click(screen.getByRole("button", { name: "OpenRouter" }));

    expect(screen.getByText("Agent connection")).toBeVisible();
  });
});
