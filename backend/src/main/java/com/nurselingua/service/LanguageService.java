package com.nurselingua.service;

import com.nurselingua.dto.Dtos.LanguageDto;
import com.nurselingua.entity.LanguageEntity;
import com.nurselingua.repository.LanguageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class LanguageService {

  private final LanguageRepository languages;

  public LanguageService(LanguageRepository languages) {
    this.languages = languages;
  }

  public List<LanguageDto> list() {
    return languages.findAll().stream().map(LanguageService::toDto).toList();
  }

  public LanguageEntity get(String code) {
    return languages.findByCode(code).orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown language: " + code));
  }

  public static LanguageDto toDto(LanguageEntity l) {
    return new LanguageDto(l.getCode(), l.getName(), l.getNativeName(), l.getTtsLocale(),
        l.isSttSupported(), l.getScript(), l.isHasRomanization(), l.isUiLocaleSupport(), l.isRtl());
  }
}
