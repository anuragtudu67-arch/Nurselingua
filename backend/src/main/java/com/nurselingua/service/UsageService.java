package com.nurselingua.service;

import com.nurselingua.dto.Dtos.PairCountDto;
import com.nurselingua.dto.Dtos.PhraseCountDto;
import com.nurselingua.dto.Dtos.PipelineStatDto;
import com.nurselingua.dto.Dtos.UsageDto;
import com.nurselingua.dto.Dtos.UsageEventRequest;
import com.nurselingua.entity.UsageEventEntity;
import com.nurselingua.integration.UserResolver;
import com.nurselingua.entity.UserEntity;
import com.nurselingua.repository.ConversationRepository;
import com.nurselingua.repository.ConversationTurnRepository;
import com.nurselingua.repository.PhraseRepository;
import com.nurselingua.repository.UsageEventRepository;
import com.nurselingua.repository.UserRepository;
import com.nurselingua.repository.WorkflowRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
public class UsageService {

  private final UsageEventRepository events;
  private final ConversationRepository conversations;
  private final ConversationTurnRepository turns;
  private final WorkflowRepository workflows;
  private final PhraseRepository phrases;
  private final UserRepository users;
  private final UserResolver userResolver;

  public UsageService(UsageEventRepository events, ConversationRepository conversations,
                      ConversationTurnRepository turns, WorkflowRepository workflows,
                      PhraseRepository phrases, UserRepository users,
                      UserResolver userResolver) {
    this.events = events;
    this.conversations = conversations;
    this.turns = turns;
    this.workflows = workflows;
    this.phrases = phrases;
    this.users = users;
    this.userResolver = userResolver;
  }

  public void record(String userId, UsageEventRequest req) {
    UserEntity u = userResolver.managed(userId);
    UsageEventEntity e = new UsageEventEntity();
    e.setUser(u);
    e.setEventType(req.eventType() == null ? "EVENT" : req.eventType());
    e.setLanguagePair(req.languagePair());
    e.setPhraseId(req.phraseId());
    e.setOutcome(req.outcome());
    e.setLatencyMs(req.latencyMs());
    e.setDetail(req.detail());
    events.save(e);
  }

  public UsageDto overview(String userId) {
    var convs = conversations.findByUserIdAndDeletedFalseOrderByLastActivityAtDesc(userId);
    long sessions = convs.size();
    long turnCount = 0;
    for (var c : convs) {
      turnCount += turns.countByConversationId(c.getId());
    }

    // language pair distribution from usage events
    List<UsageEventEntity> mine = events.findAll().stream()
        .filter(e -> userId.equals(e.getUser().getId()))
        .toList();

    List<PairCountDto> pairs = mine.stream()
        .filter(e -> e.getLanguagePair() != null)
        .collect(java.util.stream.Collectors.groupingBy(
            UsageEventEntity::getLanguagePair, java.util.stream.Collectors.counting()))
        .entrySet().stream()
        .map(en -> new PairCountDto(en.getKey(), en.getValue()))
        .sorted((a, b) -> Long.compare(b.count(), a.count()))
        .limit(10)
        .toList();

    // most-used phrases from TURN_CREATED events
    var byPhrase = mine.stream()
        .filter(e -> "TURN_CREATED".equals(e.getEventType()) && e.getPhraseId() != null)
        .collect(java.util.stream.Collectors.groupingBy(
            UsageEventEntity::getPhraseId, java.util.stream.Collectors.counting()));
    List<PhraseCountDto> topPhrases = new ArrayList<>();
    byPhrase.entrySet().stream()
        .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
        .limit(5)
        .forEach(en -> {
          String base = phrases.findById(en.getKey()).map(p -> p.getBaseText()).orElse(en.getKey());
          topPhrases.add(new PhraseCountDto(en.getKey(), base, en.getValue()));
        });

    return new UsageDto(sessions, turnCount, pairs, topPhrases,
        pipelineStats(mine, "STT"), pipelineStats(mine, "MT"), pipelineStats(mine, "TTS"));
  }

  /** STT/MT/TTS latency + failure-rate stats from usage events. */
  private PipelineStatDto pipelineStats(List<UsageEventEntity> mine, String kind) {
    List<UsageEventEntity> rel = mine.stream()
        .filter(e -> kind.equals(e.getEventType()))
        .toList();
    long total = rel.size();
    long failures = rel.stream().filter(e -> "FAILURE".equals(e.getOutcome())).count();
    Double avg = rel.stream().filter(e -> e.getLatencyMs() != null)
        .mapToInt(UsageEventEntity::getLatencyMs).average().orElse(Double.NaN);
    return new PipelineStatDto(total, failures, total == 0 ? 0.0 : (double) failures / total,
        Double.isNaN(avg) ? null : avg);
  }
}
