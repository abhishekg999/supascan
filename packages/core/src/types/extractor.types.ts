import type { Event } from "./event.types";

export type ExtractedCredentials = {
  url: string;
  key: string;
  source?: string;
};

export interface ExtractionStartedEvent
  extends Event<"extraction_started", { url: string }> {
  type: "extraction_started";
  data: { url: string };
}

export interface ContentFetchedEvent
  extends Event<
    "content_fetched",
    { url: string; size: number; contentType: string }
  > {
  type: "content_fetched";
  data: { url: string; size: number; contentType: string };
}

export interface HTMLDetectedEvent
  extends Event<"html_detected", { scriptCount: number }> {
  type: "html_detected";
  data: { scriptCount: number };
}

export interface ScriptCheckingEvent
  extends Event<"script_checking", { scriptUrl: string }> {
  type: "script_checking";
  data: { scriptUrl: string };
}

export interface CredentialsFoundEvent
  extends Event<"credentials_found", { source: string }> {
  type: "credentials_found";
  data: { source: string };
}

export interface ExtractionCompletedEvent
  extends Event<"extraction_completed", { credentials: ExtractedCredentials }> {
  type: "extraction_completed";
  data: { credentials: ExtractedCredentials };
}

export type ExtractorEvent =
  | ExtractionStartedEvent
  | ContentFetchedEvent
  | HTMLDetectedEvent
  | ScriptCheckingEvent
  | CredentialsFoundEvent
  | ExtractionCompletedEvent;
