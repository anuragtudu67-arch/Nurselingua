package com.nurselingua.controller;

import com.nurselingua.config.SecurityConfig;
import com.nurselingua.dto.Dtos.CategoryDto;
import com.nurselingua.dto.Dtos.LanguageDto;
import com.nurselingua.dto.Dtos.PhraseDto;
import com.nurselingua.service.LanguageService;
import com.nurselingua.service.PhraseService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Languages, phrase categories, and the phrasebook (public catalog surface). */
@RestController
@RequestMapping("/api/v1")
public class CatalogControllers {

  private final LanguageService languages;
  private final PhraseService phrases;

  public CatalogControllers(LanguageService languages, PhraseService phrases) {
    this.languages = languages;
    this.phrases = phrases;
  }

  @GetMapping("/languages")
  public List<LanguageDto> languages() {
    return languages.list();
  }

  @GetMapping("/categories")
  public List<CategoryDto> categories() {
    return phrases.categories();
  }

  @GetMapping("/phrases")
  public List<PhraseDto> phrases(@RequestParam(required = false) String category,
                                 @RequestParam(required = false) String q,
                                 @RequestParam(defaultValue = "es") String lang) {
    String userId = currentUserId();
    if (q != null && !q.isBlank()) return phrases.search(q, userId, lang);
    if (category != null && !category.isBlank()) return phrases.byCategory(category, userId, lang);
    return phrases.byCategory("symptoms", userId, lang);
  }

  @GetMapping("/phrases/{id}")
  public PhraseDto phrase(@PathVariable String id,
                          @RequestParam(defaultValue = "es") String lang) {
    return phrases.phrase(id, currentUserId(), lang);
  }

  private String currentUserId() {
    var u = SecurityConfig.current();
    return u == null ? null : u.userId();
  }
}
