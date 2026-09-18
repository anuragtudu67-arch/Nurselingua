package com.nurselingua.controller;

import com.nurselingua.config.SecurityConfig;
import com.nurselingua.dto.Dtos.AddFavoriteRequest;
import com.nurselingua.dto.Dtos.AddTurnRequest;
import com.nurselingua.dto.Dtos.ConversationDetailDto;
import com.nurselingua.dto.Dtos.ConversationDto;
import com.nurselingua.dto.Dtos.CreateConversationRequest;
import com.nurselingua.dto.Dtos.FavoriteDto;
import com.nurselingua.dto.Dtos.RecentDto;
import com.nurselingua.dto.Dtos.TranslationRequest;
import com.nurselingua.dto.Dtos.TranslationResponse;
import com.nurselingua.dto.Dtos.TurnDto;
import com.nurselingua.entity.UserSettingsEntity;
import com.nurselingua.security.AppUser;
import com.nurselingua.service.ConversationService;
import com.nurselingua.service.FavoriteService;
import com.nurselingua.service.TranslationService;
import com.nurselingua.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/** Conversation mode + translation + favorites + recents + history. */
@RestController
@RequestMapping("/api/v1")
public class ConversationControllers {

  private final ConversationService conversations;
  private final TranslationService translation;
  private final FavoriteService engagement;
  private final UserService users;

  public ConversationControllers(ConversationService conversations,
                                 TranslationService translation,
                                 FavoriteService engagement,
                                 UserService users) {
    this.conversations = conversations;
    this.translation = translation;
    this.engagement = engagement;
    this.users = users;
  }

  private UserService.Me me() {
    AppUser u = SecurityConfig.current();
    if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    return UserService.me(u);
  }

  // ---------- conversations ----------

  @PostMapping("/conversations")
  @ResponseStatus(HttpStatus.CREATED)
  public ConversationDto create(@RequestBody CreateConversationRequest req) {
    return conversations.create(me().userId(), req);
  }

  @GetMapping("/conversations")
  public List<ConversationDto> list() {
    return conversations.history(me().userId());
  }

  @GetMapping("/conversations/{id}")
  public ConversationDetailDto detail(@PathVariable String id) {
    return conversations.detail(me().userId(), id);
  }

  @DeleteMapping("/conversations/{id}")
  public Map<String, Object> delete(@PathVariable String id) {
    conversations.delete(me().userId(), id);
    return Map.of("ok", true);
  }

  @PostMapping("/conversations/{id}/turns")
  @ResponseStatus(HttpStatus.CREATED)
  public TurnDto addTurn(@PathVariable String id, @RequestBody AddTurnRequest req) {
    return conversations.addTurn(me().userId(), id, req);
  }

  // ---------- one-shot translation ----------

  @PostMapping("/translations")
  public TranslationResponse translate(@RequestBody TranslationRequest req) {
    UserService.Me m = me();
    if (req.text() == null || req.text().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "text is required");
    }
    UserSettingsEntity s = users.settingsFor(m.userId());
    String from = req.from() != null ? req.from() : s.getNurseLanguage();
    String to = req.to() != null ? req.to() : firstPatient(s);
    TranslationService.Result r = translation.translate(req.text(), from, to, s);
    return new TranslationResponse(req.text(), from, r.text(), to, r.romanization(),
        r.matchedLibrary(), r.phraseId(), r.professionallyReviewed());
  }

  private String firstPatient(UserSettingsEntity s) {
    String csv = s.getPatientLanguages();
    return (csv == null || csv.isBlank()) ? "es" : csv.split(",")[0];
  }

  // ---------- favorites + recents ----------

  @GetMapping("/favorites")
  public List<FavoriteDto> favorites() {
    return engagement.favorites(me().userId());
  }

  @PostMapping("/favorites")
  @ResponseStatus(HttpStatus.CREATED)
  public FavoriteDto addFavorite(@RequestBody AddFavoriteRequest req) {
    return engagement.add(me().userId(), req);
  }

  @DeleteMapping("/favorites/{phraseId}/{languageCode}")
  public Map<String, Object> removeFavorite(@PathVariable String phraseId,
                                            @PathVariable String languageCode) {
    engagement.remove(me().userId(), phraseId, languageCode);
    return Map.of("ok", true);
  }

  @GetMapping("/recents")
  public List<RecentDto> recents() {
    return engagement.recents(me().userId());
  }
}
