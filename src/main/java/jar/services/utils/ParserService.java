package jar.services.utils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Getter;

import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public class ParserService {
    @Getter
    @AllArgsConstructor(staticName="of")
    public static class ParseError { // TODO : en faire un objet générique dans la gestion des erreurs
        private String status; // SUCCESS or ERROR // TODO create parent object for all future object to send and extend for having a 'status' variable every time
        private String message;
    }
    private final ObjectMapper mapper;

    @Inject
    public ParserService() {
        mapper = new ObjectMapper();
    }

    public String parseObject(Object object) {
        try {
            return mapper.writeValueAsString(object);
        }
        catch (JsonProcessingException e) {
            e.printStackTrace();
        }

        try {
            return mapper.writeValueAsString(ParseError.of("ERROR", "Parsing error"));
        }
        catch (JsonProcessingException e) {
            e.printStackTrace();
            return "INTERNAL_ERROR";
        }
    }
}
