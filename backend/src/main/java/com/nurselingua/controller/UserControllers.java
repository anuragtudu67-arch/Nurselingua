package com.nurselingua.controller;

import com.nurselingua.config.SecurityConfig;
import com.nurselingua.dto.Dtos.OnboardingRequest;
import com.nurselingua.dto.Dtos.SettingsUpdateRequest;
import com.nurselingua.dto.Dtos.UsageDto;
import com.nurselingua.dto.Dtos.UsageEventRequest;
import com.nurselingua.dto.Dtos.UsersMeDto;
import com.nurselingua.security.AppUser;
import com.nurselingua.service.UsageService;
import com.nurselingua.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/** Identity, onboarding, settings, and usage analytics. */
@RestController
@RequestMapping("/api/v1")
public class UserControllers {

  private final UserService users;
  private final UsageService usage;

  public UserControllers(UserService users, UsageService usage) {
    this.users = users;
    this.usage = usage;
  }

  private UserService.Me me() {
    AppUser u = SecurityConfig.current();
    if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    return UserService.me(u);
  }

  @GetMapping("/users/me")
  public UsersMeDto usersMe() {
    return users.usersMe(me());
  }

  @PostMapping("/onboarding")
  public UsersMeDto onboarding(@RequestBody OnboardingRequest req) {
    return users.saveOnboarding(me(), req);
  }

  @PutMapping("/settings")
  public UsersMeDto settings(@RequestBody SettingsUpdateRequest req) {
    return users.updateSettings(me(), req);
  }

  @GetMapping("/usage")
  public UsageDto usage() {
    return usage.overview(me().userId());
  }

  @PostMapping("/usage/events")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public Map<String, Object> recordEvent(@RequestBody UsageEventRequest req) {
    usage.record(me().userId(), req);
    return Map.of("ok", true);
  }
}
