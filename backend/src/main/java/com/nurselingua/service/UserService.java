package com.nurselingua.service;

import com.nurselingua.dto.Dtos.SettingsDto;
import com.nurselingua.dto.Dtos.UsersMeDto;
import com.nurselingua.dto.Dtos.OnboardingRequest;
import com.nurselingua.dto.Dtos.SettingsUpdateRequest;
import com.nurselingua.entity.LanguageEntity;
import com.nurselingua.entity.UserEntity;
import com.nurselingua.entity.UserSettingsEntity;
import com.nurselingua.repository.UserRepository;
import com.nurselingua.repository.UserSettingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class UserService {

  private final UserRepository users;
  private final UserSettingsRepository settings;
  private final LanguageService languages;

  public UserService(UserRepository users, UserSettingsRepository settings,
                     LanguageService languages) {
    this.users = users;
    this.settings = settings;
    this.languages = languages;
  }

  public record Me(String userId, String email, String name) {}

  /** The AppUser → Me bridge; identity always derives from the verified token. */
  public static Me me(com.nurselingua.security.AppUser u) {
    return new Me(u.userId(), u.email(), u.name());
  }

  @Transactional
  public UsersMeDto usersMe(Me me) {
    UserEntity u = users.findById(me.userId()).orElseGet(() -> provision(me));
    UserSettingsEntity s = settingsFor(me.userId());
    return new UsersMeDto(u.getId(), u.getEmail(), u.getName(), toDto(s), s.isOnboardingComplete());
  }

  private UserEntity provision(Me me) {
    UserEntity nu = new UserEntity();
    nu.setId(me.userId());
    nu.setClerkUserId("provisioned|" + me.userId());
    nu.setEmail(me.email() != null ? me.email() : me.userId() + "@nurselingua.local");
    nu.setName(me.name());
    return users.save(nu);
  }

  @Transactional
  public UserSettingsEntity settingsFor(String userId) {
    return settings.findByUserId(userId).orElseGet(() -> {
      UserSettingsEntity s = new UserSettingsEntity();
      s.setUserId(userId);
      return settings.save(s);
    });
  }

  /** Lazily provisions the user row on first authenticated action. */
  @Transactional
  public UserEntity findByIdForReference(String userId) {
    return users.findById(userId).orElseGet(() -> {
      UserEntity nu = new UserEntity();
      nu.setId(userId);
      nu.setClerkUserId("provisioned|" + userId);
      nu.setEmail(userId + "@nurselingua.local");
      return users.save(nu);
    });
  }

  @Transactional
  public UsersMeDto saveOnboarding(Me me, OnboardingRequest req) {
    UserSettingsEntity s = settingsFor(me.userId());
    if (req.nurseLanguage() != null) {
      languages.get(req.nurseLanguage()); // validate
      s.setNurseLanguage(req.nurseLanguage());
    }
    if (req.patientLanguages() != null && !req.patientLanguages().isEmpty()) {
      validateLanguages(req.patientLanguages());
      s.setPatientLanguages(String.join(",", req.patientLanguages()));
    }
    if (req.speechRate() != null) s.setSpeechRate(req.speechRate());
    if (req.retention() != null) s.setRetention(req.retention());
    s.setOnboardingComplete(true);
    settings.save(s);
    return usersMe(me);
  }

  @Transactional
  public UsersMeDto updateSettings(Me me, SettingsUpdateRequest req) {
    UserSettingsEntity s = settingsFor(me.userId());
    if (req.nurseLanguage() != null) {
      languages.get(req.nurseLanguage());
      s.setNurseLanguage(req.nurseLanguage());
    }
    if (req.patientLanguages() != null) {
      if (!req.patientLanguages().isEmpty()) validateLanguages(req.patientLanguages());
      s.setPatientLanguages(String.join(",", req.patientLanguages()));
    }
    if (req.speechRate() != null) s.setSpeechRate(req.speechRate());
    if (req.retention() != null) s.setRetention(req.retention());
    settings.save(s);
    return usersMe(me);
  }

  private void validateLanguages(List<String> codes) {
    for (String c : codes) languages.get(c);
  }

  private static SettingsDto toDto(UserSettingsEntity s) {
    return new SettingsDto(s.getNurseLanguage(),
        List.of(s.getPatientLanguages().split(",")),
        s.getSpeechRate(), s.getRetention());
  }
}
