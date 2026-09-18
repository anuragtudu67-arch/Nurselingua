package com.nurselingua.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;

/** Explicit, calm, human-readable error responses (spec §2). */
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, Object>> rse(ResponseStatusException e) {
    String reason = e.getReason() != null ? e.getReason() : e.getStatusCode().toString();
    return ResponseEntity.status(e.getStatusCode())
        .body(Map.of("error", reason, "status", e.getStatusCode().value()));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, Object>> unreadable(HttpMessageNotReadableException e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", "That request could not be read. Check the values you submitted.",
                     "status", 400));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", "Please check the submitted values.", "status", 400));
  }

  /** Wrong or missing parameter types are the caller's mistake, not a server fault. */
  @ExceptionHandler({MissingServletRequestParameterException.class,
                     MethodArgumentTypeMismatchException.class})
  public ResponseEntity<Map<String, Object>> badParameter(Exception e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", "Please check the values you submitted.", "status", 400));
  }

  @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
  public ResponseEntity<Map<String, Object>> unsupportedType(HttpMediaTypeNotSupportedException e) {
    return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
        .body(Map.of("error", "Unsupported content type. Send JSON with Content-Type: application/json.",
                     "status", 415));
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<Map<String, Object>> unsupportedMethod(HttpRequestMethodNotSupportedException e) {
    return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
        .body(Map.of("error", "That method is not allowed on this endpoint.", "status", 405));
  }

  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<Map<String, Object>> noEndpoint(NoResourceFoundException e) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(Map.of("error", "No such endpoint.", "status", 404));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> generic(Exception e) {
    org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class)
        .error("Unhandled API error", e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", "Something went wrong on our side. Nothing was lost.",
                     "status", 500));
  }
}
