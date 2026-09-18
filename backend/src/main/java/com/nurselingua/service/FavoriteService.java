package com.nurselingua.service;

import com.nurselingua.dto.Dtos.AddFavoriteRequest;
import com.nurselingua.dto.Dtos.FavoriteDto;
import com.nurselingua.dto.Dtos.RecentDto;
import com.nurselingua.entity.FavoriteEntity;
import com.nurselingua.entity.RecentEntity;
import com.nurselingua.entity.UserEntity;
import com.nurselingua.integration.UserResolver;
import com.nurselingua.repository.FavoriteRepository;
import com.nurselingua.repository.PhraseRepository;
import com.nurselingua.repository.RecentRepository;
import com.nurselingua.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class FavoriteService {

  private final FavoriteRepository favorites;
  private final RecentRepository recents;
  private final UserRepository users;
  private final PhraseRepository phrases;
  private final UserResolver userResolver;

  public FavoriteService(FavoriteRepository favorites, RecentRepository recents,
                         UserRepository users, PhraseRepository phrases,
                         UserResolver userResolver) {
    this.favorites = favorites;
    this.recents = recents;
    this.users = users;
    this.phrases = phrases;
    this.userResolver = userResolver;
  }

  private UserEntity user(String userId) {
    // Managed via REQUIRES_NEW resolver — provisions on first use.
    return userResolver.managed(userId);
  }

  private void requirePhrase(String phraseId) {
    if (phrases.findById(phraseId).isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown phrase: " + phraseId);
    }
  }

  // ---------- favorites ----------

  public List<FavoriteDto> favorites(String userId) {
    return favorites.findByUserIdOrderByCreatedAtDesc(userId).stream()
        .map(f -> new FavoriteDto(f.getPhraseId(), f.getLanguageCode(), f.getCreatedAt()))
        .toList();
  }

  @Transactional
  public FavoriteDto add(String userId, AddFavoriteRequest req) {
    requirePhrase(req.phraseId());
    user(userId);
    FavoriteEntity f = favorites.findByUserIdAndPhraseIdAndLanguageCode(
        userId, req.phraseId(), req.languageCode()).orElseGet(() -> {
          FavoriteEntity nf = new FavoriteEntity();
          nf.setUser(user(userId));
          nf.setPhraseId(req.phraseId());
          nf.setLanguageCode(req.languageCode());
          return favorites.save(nf);
        });
    return new FavoriteDto(f.getPhraseId(), f.getLanguageCode(), f.getCreatedAt());
  }

  @Transactional
  public void remove(String userId, String phraseId, String languageCode) {
    favorites.findByUserIdAndPhraseIdAndLanguageCode(userId, phraseId, languageCode)
        .ifPresent(favorites::delete);
  }

  // ---------- recents ----------

  public List<RecentDto> recents(String userId) {
    return recents.findTop12ByUserIdOrderByUsedAtDesc(userId).stream()
        .map(r -> new RecentDto(r.getPhraseId(), r.getLanguageCode(), r.getUsedAt()))
        .toList();
  }

  /** Upsert — reuse keeps a single row per (user, phrase, language). */
  @Transactional
  public void touchRecent(String userId, String phraseId, String languageCode) {
    requirePhrase(phraseId);
    user(userId);
    RecentEntity r = recents.findByUserIdAndPhraseIdAndLanguageCode(userId, phraseId, languageCode)
        .orElseGet(() -> {
          RecentEntity nr = new RecentEntity();
          nr.setUser(user(userId));
          nr.setPhraseId(phraseId);
          nr.setLanguageCode(languageCode);
          return nr;
        });
    r.setUsedAt(Instant.now());
    recents.save(r);
  }
}
