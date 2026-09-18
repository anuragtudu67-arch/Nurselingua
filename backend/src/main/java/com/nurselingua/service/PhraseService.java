package com.nurselingua.service;

import com.nurselingua.dto.Dtos.CategoryDto;
import com.nurselingua.dto.Dtos.PhraseDto;
import com.nurselingua.dto.Dtos.PhraseTranslationDto;
import com.nurselingua.entity.PhraseCategoryEntity;
import com.nurselingua.entity.PhraseEntity;
import com.nurselingua.entity.PhraseTranslationEntity;
import com.nurselingua.repository.FavoriteRepository;
import com.nurselingua.repository.PhraseCategoryRepository;
import com.nurselingua.repository.PhraseRepository;
import com.nurselingua.repository.PhraseTranslationRepository;
import com.nurselingua.repository.RecentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PhraseService {

  private final PhraseRepository phrases;
  private final PhraseCategoryRepository categories;
  private final PhraseTranslationRepository translations;
  private final FavoriteRepository favorites;
  private final RecentRepository recents;

  public PhraseService(PhraseRepository phrases, PhraseCategoryRepository categories,
                       PhraseTranslationRepository translations, FavoriteRepository favorites,
                       RecentRepository recents) {
    this.phrases = phrases;
    this.categories = categories;
    this.translations = translations;
    this.favorites = favorites;
    this.recents = recents;
  }

  // ---------- categories ----------

  @Transactional(readOnly = true)
  public List<CategoryDto> categories() {
    return categories.findAllByOrderByPositionAsc().stream()
        .map(PhraseService::toDto).toList();
  }

  private static CategoryDto toDto(PhraseCategoryEntity c) {
    return new CategoryDto(c.getSlug(), c.getName(), c.getDescription(), c.getPosition());
  }

  // ---------- phrase lists ----------

  // Transactions stay open through DTO mapping: the phrase -> category slug is a lazy
  // association, so mapping after the session closes would fail (open-in-view is off).
  @Transactional(readOnly = true)
  public List<PhraseDto> byCategory(String slug, String userId, String patientLang) {
    PhraseCategoryEntity cat = categories.findBySlug(slug).orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown category: " + slug));
    return decorate(phrases.findByCategoryIdOrderByPriorityAscBaseTextAsc(cat.getId()),
        userId, patientLang);
  }

  @Transactional(readOnly = true)
  public List<PhraseDto> search(String q, String userId, String patientLang) {
    return decorate(phrases.findByBaseTextContainingIgnoreCaseOrderByPriorityAsc(q),
        userId, patientLang);
  }

  @Transactional(readOnly = true)
  public PhraseDto phrase(String id, String userId, String patientLang) {
    PhraseEntity p = phrases.findById(id).orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown phrase: " + id));
    return decorate(List.of(p), userId, patientLang).get(0);
  }

  /** Attaches patient-language translations + the caller's favorite flag. */
  private List<PhraseDto> decorate(List<PhraseEntity> list, String userId, String patientLang) {
    Map<String, PhraseTranslationEntity> tr = new HashMap<>();
    for (PhraseEntity p : list) {
      translations.findByPhraseIdAndLanguageCode(p.getId(), patientLang)
          .ifPresent(t -> tr.put(p.getId(), t));
    }
    Set<String> favIds = userId == null ? Set.of() : favorites.findByUserIdOrderByCreatedAtDesc(userId)
        .stream().map(f -> f.getPhraseId() + "|" + f.getLanguageCode()).collect(Collectors.toSet());

    return list.stream().map(p -> {
      PhraseTranslationEntity t = tr.get(p.getId());
      List<PhraseTranslationDto> tds = t == null ? List.of() : List.of(new PhraseTranslationDto(
          t.getLanguageCode(), t.getText(), t.getRomanization(), t.getAudioRef(),
          t.isProfessionallyReviewed()));
      boolean fav = favIds.contains(p.getId() + "|" + patientLang);
      return new PhraseDto(p.getId(), p.getCategory().getSlug(), p.getBaseText(),
          p.isQuestion(), p.getCardType(), parseTags(p.getTags()), p.getPriority(), tds, fav);
    }).toList();
  }

  private static List<String> parseTags(String tags) {
    if (tags == null || tags.isBlank()) return List.of();
    return List.of(tags.split(","));
  }

  // ---------- fuzzy library matching (library-first translation) ----------

  /**
   * Best-effort match of free text against the phrase library.
   * 1. exact (case/punctuation-insensitive) match on base text
   * 2. token-overlap fuzzy score over all phrases
   * Returns the matched phrase or null. Used before any machine translation.
   */
  public PhraseEntity matchLibrary(String text) {
    String norm = normalize(text);
    if (norm.isBlank()) return null;

    // 1) exact
    for (PhraseEntity p : phrases.findAll()) {
      if (normalize(p.getBaseText()).equals(norm)) return p;
    }
    // 2) fuzzy token overlap, accepting confident matches only
    PhraseEntity best = null;
    double bestScore = 0;
    Set<String> tokens = tokenSet(norm);
    for (PhraseEntity p : phrases.findAll()) {
      double score = similarity(tokens, tokenSet(normalize(p.getBaseText())));
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return bestScore >= 0.8 ? best : null;
  }

  static double similarity(Set<String> a, Set<String> b) {
    if (a.isEmpty() || b.isEmpty()) return 0;
    long overlap = a.stream().filter(b::contains).count();
    return (double) overlap / Math.max(a.size(), b.size());
  }

  static Set<String> tokenSet(String s) {
    // HashSet (not Set.of): repeated words like "...the dose on the label" are legal.
    return new java.util.HashSet<>(java.util.Arrays.asList(s.split("\\s+")));
  }

  static String normalize(String s) {
    return s.toLowerCase(Locale.ROOT)
        .replace('–', '-').replace('—', '-')   // normalize dashes (STT output varies)
        .replaceAll("[^\\p{L}\\p{Nd}\\s]", " ")
        .replaceAll("\\s+", " ")
        .trim();
  }
}
